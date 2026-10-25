package main

import (
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"backend/config"
	"backend/shared/model"
	"backend/shared/utils"
)

var wipeTables = []string{
	"users", "refresh_tokens", "scrolls", "likes", "bookmarks", "comments", "scroll_reads", "rate_limits", "xp_logs",
	"daily_xp_counters", "topic_masteries", "user_badges", "user_streaks", "challenges", "challenge_submissions", "profile_visits",
}

func rowCounts() string {
	var b strings.Builder
	for _, t := range wipeTables {
		var n int64
		config.DB.Table(t).Count(&n)
		fmt.Fprintf(&b, "  %-24s %d\n", t, n)
	}
	return b.String()
}

// wipe removes every row except categories and the Cloudinary images those rows referenced.
func wipe() {
	if config.Cloudinary != nil {
		var ids []string
		config.DB.Raw(`SELECT avatar_public_id FROM users WHERE avatar_public_id <> '' UNION SELECT cover_image_public_id FROM scrolls WHERE cover_image_public_id <> ''`).Scan(&ids)
		for _, id := range ids {
			if err := utils.DeleteImage(id); err != nil {
				log.Println("cloudinary:", err)
			}
		}
		log.Printf("deleted %d Cloudinary images", len(ids))
	}
	if err := config.DB.Exec("TRUNCATE " + strings.Join(wipeTables, ", ") + " RESTART IDENTITY CASCADE").Error; err != nil {
		log.Fatal(err)
	}
}

func insert[T any](rows []T) {
	if len(rows) == 0 {
		return
	}
	if err := config.DB.CreateInBatches(rows, 200).Error; err != nil {
		log.Fatalf("insert %T: %v", rows[0], err)
	}
}

func (s *sim) flush() {
	var users []model.User
	var streaks []model.UserStreak
	var topics []model.TopicMastery
	for _, u := range s.users {
		users = append(users, u.User)
		for _, st := range u.streaks {
			streaks = append(streaks, *st)
		}
		for _, m := range u.topics {
			topics = append(topics, *m)
		}
	}
	var scrolls []model.Scroll
	for _, sc := range s.scrolls {
		scrolls = append(scrolls, sc.Scroll)
	}
	var counters []model.DailyXPCounter
	for k, amount := range s.counters {
		p := strings.SplitN(k, "|", 3)
		uid, _ := strconv.Atoi(p[0])
		d, _ := time.ParseInLocation("2006-01-02", p[1], jkt)
		counters = append(counters, model.DailyXPCounter{UserID: uint(uid), CounterDate: d, CounterKey: p[2], Amount: amount})
	}
	insert(users)
	insert(scrolls)
	insert(s.reads)
	insert(s.likes)
	insert(s.bookmarks)
	insert(s.comments)
	insert(s.logs)
	insert(counters)
	insert(topics)
	insert(s.userBadge)
	insert(streaks)
	insert(s.chals)
	insert(s.subs)
	insert(s.visits)
	for _, t := range []string{"users", "scrolls", "likes", "bookmarks", "comments", "xp_logs", "topic_masteries", "user_badges", "challenges", "challenge_submissions"} {
		q := fmt.Sprintf("SELECT setval(pg_get_serial_sequence('%s','id'), (SELECT COALESCE(MAX(id),1) FROM %s))", t, t)
		if err := config.DB.Exec(q).Error; err != nil {
			log.Fatal(err)
		}
	}
}

// verify cross-checks the stored aggregates against the underlying rows; any non-zero count is a seeding bug.
func verify() {
	checks := map[string]string{
		"users.total_xp ≠ sum(xp_logs)":         `SELECT COUNT(*) FROM users u WHERE total_xp <> COALESCE((SELECT SUM(amount) FROM xp_logs WHERE user_id = u.id),0)`,
		"scrolls.likes_count ≠ likes":           `SELECT COUNT(*) FROM scrolls s WHERE likes_count <> (SELECT COUNT(*) FROM likes WHERE scroll_id = s.id)`,
		"scrolls.bookmarks_count ≠ bookmarks":   `SELECT COUNT(*) FROM scrolls s WHERE bookmarks_count <> (SELECT COUNT(*) FROM bookmarks WHERE scroll_id = s.id)`,
		"scrolls.comments_count ≠ comments":     `SELECT COUNT(*) FROM scrolls s WHERE comments_count <> (SELECT COUNT(*) FROM comments WHERE scroll_id = s.id)`,
		"scrolls.view_count ≠ scroll_reads":     `SELECT COUNT(*) FROM scrolls s WHERE view_count <> (SELECT COUNT(*) FROM scroll_reads WHERE scroll_id = s.id)`,
		"scroll approved by its own author":     `SELECT COUNT(*) FROM scrolls WHERE reviewed_by_id = author_id`,
		"published scroll without reviewer":     `SELECT COUNT(*) FROM scrolls WHERE status IN ('published','archived') AND reviewed_by_id IS NULL`,
		"topic contributed ≠ published scrolls": `SELECT COUNT(*) FROM topic_masteries m WHERE scrolls_contributed <> (SELECT COUNT(*) FROM scrolls WHERE author_id = m.user_id AND category_id = m.category_id AND status IN ('published','archived'))`,
		"topic read ≠ reads of others' scrolls": `SELECT COUNT(*) FROM topic_masteries m WHERE scrolls_read <> (SELECT COUNT(*) FROM scroll_reads r JOIN scrolls s ON s.id = r.scroll_id WHERE r.user_id = m.user_id AND s.category_id = m.category_id AND s.author_id <> r.user_id)`,
		"duplicate xp log":                      `SELECT COUNT(*) FROM (SELECT 1 FROM xp_logs GROUP BY user_id, reason, source_id HAVING COUNT(*) > 1) d`,
	}
	bad := 0
	for name, q := range checks {
		var n int64
		if err := config.DB.Raw(q).Scan(&n).Error; err != nil {
			log.Fatalf("%s: %v", name, err)
		}
		if n != 0 {
			bad++
			log.Printf("✘ %s: %d", name, n)
		}
	}
	if bad == 0 {
		log.Printf("✔ all %d consistency checks passed", len(checks))
	}
}
