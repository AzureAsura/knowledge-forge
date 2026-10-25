package gamification

import (
	"errors"
	"math"
	"time"

	"backend/config"
	"backend/shared/gamification"
	"backend/shared/model"
	"backend/shared/utils"
)

func getTree(userID uint) (TreeResponse, error) {
	var user model.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		return TreeResponse{}, errors.New("user not found")
	}

	categories, err := gamification.GetLeafCategories()
	if err != nil {
		return TreeResponse{}, err
	}

	var masteries []model.TopicMastery
	config.DB.Where("user_id = ?", userID).Find(&masteries)
	byCategory := map[uint]model.TopicMastery{}
	for _, m := range masteries {
		byCategory[m.CategoryID] = m
	}

	// One query for how many scrolls each topic holds; the owner's own scrolls never count as "readable".
	var counts []struct {
		CategoryID uint
		Published  int
		Readable   int
	}
	config.DB.Raw(`SELECT category_id, COUNT(*) AS published, COUNT(*) FILTER (WHERE author_id <> ?) AS readable
		FROM scrolls WHERE status = 'published' GROUP BY category_id`, userID).Scan(&counts)
	byTopic := map[uint][2]int{}
	for _, c := range counts {
		byTopic[c.CategoryID] = [2]int{c.Published, c.Readable}
	}

	nodes := make([]TreeNode, 0, len(categories))
	totalLevel := 0
	for _, c := range categories {
		m := byCategory[c.ID]
		nextLevel := min(m.Level+1, gamification.MaxLevel)
		xpForNext, _, _ := gamification.GetTopicLevelRequirements(nextLevel)
		var next *NextLevel
		if m.Level < gamification.MaxLevel {
			xp, contributed, read := gamification.GetTopicLevelRequirements(m.Level + 1)
			next = &NextLevel{Level: m.Level + 1, XP: xp, Contributed: contributed, Read: read, BonusXP: gamification.TopicLevelBonus(m.Level + 1)}
		}
		nodes = append(nodes, TreeNode{
			ID: c.ID, Name: c.Name, Slug: c.Slug, Level: m.Level,
			XPInTopic: m.XPInTopic, XPForNextLevel: xpForNext,
			ScrollsContributed: m.ScrollsContributed, ScrollsRead: m.ScrollsRead,
			NextLevel:        next,
			PublishedScrolls: byTopic[c.ID][0], ReadableScrolls: byTopic[c.ID][1],
		})
		totalLevel += m.Level
	}

	return TreeResponse{
		Nodes:  nodes,
		Center: TreeCenter{Name: "KnoFo", TotalLevel: totalLevel, TotalXP: user.TotalXP},
	}, nil
}

func getXPHistory(userID uint, page, limit int) ([]model.XPLog, model.Pagination, error) {
	page = max(page, 1)
	if limit < 1 {
		limit = 20
	}
	if limit > 50 {
		limit = 50
	}

	var total int64
	if err := config.DB.Model(&model.XPLog{}).Where("user_id = ?", userID).Count(&total).Error; err != nil {
		return nil, model.Pagination{}, err
	}

	var logs []model.XPLog
	err := config.DB.Where("user_id = ?", userID).Order("created_at desc").Limit(limit).Offset((page - 1) * limit).Find(&logs).Error
	if err != nil {
		return nil, model.Pagination{}, err
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))
	pagination := model.Pagination{Page: page, Limit: limit, Total: total, TotalPages: totalPages}

	return logs, pagination, nil
}

func getXPStats(userID uint) (XPStatsResponse, error) {
	var user model.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		return XPStatsResponse{}, errors.New("user not found")
	}

	level, title, xpIntoLevel, xpForNextLevel := utils.LevelFromTotalXP(user.TotalXP)
	progress := 100.0
	if xpForNextLevel > 0 {
		progress = math.Round(float64(xpIntoLevel)/float64(xpForNextLevel)*1000) / 10
	}

	return XPStatsResponse{
		TotalXP:            user.TotalXP,
		CurrentLevel:       level,
		Title:              title,
		XPForNextLevel:     xpForNextLevel,
		XPNeeded:           xpForNextLevel - xpIntoLevel,
		ProgressPercentage: progress,
	}, nil
}

var (
	ErrBadgeNotFound        = errors.New("badge not found")
	ErrBadgeNotManual       = errors.New("BADGE_NOT_MANUAL")
	ErrBadgeUserNotFound    = errors.New("user not found")
	ErrBadgeAlreadyUnlocked = errors.New("user already has this badge")
)

func listBadges() []BadgeDefinitionResponse {
	defs := gamification.AllBadgeDefinitions()
	items := make([]BadgeDefinitionResponse, 0, len(defs))
	for _, b := range defs {
		items = append(items, BadgeDefinitionResponse{
			Slug: b.Slug, Name: b.Name, Icon: b.Icon, Color: b.Color, XPReward: b.XPReward, TriggerType: b.TriggerType,
		})
	}
	return items
}

func myBadges(userID uint) ([]MyBadgeResponse, error) {
	items, err := gamification.MyBadges(userID)
	if err != nil {
		return nil, err
	}
	out := make([]MyBadgeResponse, 0, len(items))
	for _, it := range items {
		out = append(out, MyBadgeResponse{
			Slug: it.Slug, Name: it.Name, Icon: it.Icon, Color: it.Color, XPReward: it.XPReward,
			Unlocked: it.Unlocked, UnlockedAt: it.UnlockedAt, PercentDone: it.PercentDone,
		})
	}
	return out, nil
}

func grantBadge(adminID uint, slug string, targetUserID uint) (gamification.UnlockResult, error) {
	b, ok := gamification.FindBadgeDefinition(slug)
	if !ok {
		return gamification.UnlockResult{}, ErrBadgeNotFound
	}
	if b.TriggerType != "manual" {
		return gamification.UnlockResult{}, ErrBadgeNotManual
	}

	var target model.User
	if err := config.DB.First(&target, targetUserID).Error; err != nil {
		return gamification.UnlockResult{}, ErrBadgeUserNotFound
	}

	var existing model.UserBadge
	if err := config.DB.Where("user_id = ? AND badge_slug = ?", targetUserID, slug).First(&existing).Error; err == nil {
		return gamification.UnlockResult{}, ErrBadgeAlreadyUnlocked
	}

	return gamification.Unlock(targetUserID, b, &adminID)
}

type metricRow struct {
	UserID    uint
	FullName  string
	Username  string
	AvatarURL string
	Level     int
	CreatedAt time.Time
	Metric    int64
}

// periodBounds returns the current window [start, end) and, for 7d/30d, the
// immediately preceding window of the same length (used for trend). "all" has no window.
func periodBounds(period string) (start, end, prevStart, prevEnd *time.Time) {
	var duration time.Duration
	switch period {
	case "7d":
		duration = 7 * 24 * time.Hour
	case "30d":
		duration = 30 * 24 * time.Hour
	default:
		return nil, nil, nil, nil
	}
	now := time.Now()
	s := now.Add(-duration)
	ps := now.Add(-2 * duration)
	pe := s
	return &s, &now, &ps, &pe
}

func queryMetricRows(leaderboardType string, start, end *time.Time) ([]metricRow, error) {
	var rows []metricRow
	var sql string
	var args []any

	switch leaderboardType {
	case "scribes":
		if start == nil {
			sql = `SELECT u.id AS user_id, u.full_name, u.username, u.avatar_url, u.current_level AS level, u.created_at,
			              COUNT(s.id) AS metric
			       FROM users u
			       JOIN scrolls s ON s.author_id = u.id AND s.status = 'published'
			       WHERE u.is_active = true
			       GROUP BY u.id
			       HAVING COUNT(s.id) > 0
			       ORDER BY metric DESC, u.created_at ASC, u.id ASC`
		} else {
			sql = `SELECT u.id AS user_id, u.full_name, u.username, u.avatar_url, u.current_level AS level, u.created_at,
			              COUNT(s.id) AS metric
			       FROM users u
			       JOIN scrolls s ON s.author_id = u.id AND s.status = 'published' AND s.published_at >= ? AND s.published_at < ?
			       WHERE u.is_active = true
			       GROUP BY u.id
			       HAVING COUNT(s.id) > 0
			       ORDER BY metric DESC, u.created_at ASC, u.id ASC`
			args = []any{*start, *end}
		}
	case "mentors":
		if start == nil {
			sql = `SELECT u.id AS user_id, u.full_name, u.username, u.avatar_url, u.current_level AS level, u.created_at,
			              COALESCE(SUM(x.amount), 0) AS metric
			       FROM users u
			       JOIN users a ON a.mentor_id = u.id AND a.is_active = true
			       JOIN xp_logs x ON x.user_id = a.id
			       WHERE u.is_active = true
			       GROUP BY u.id
			       HAVING COALESCE(SUM(x.amount), 0) > 0
			       ORDER BY metric DESC, u.created_at ASC, u.id ASC`
		} else {
			sql = `SELECT u.id AS user_id, u.full_name, u.username, u.avatar_url, u.current_level AS level, u.created_at,
			              COALESCE(SUM(x.amount), 0) AS metric
			       FROM users u
			       JOIN users a ON a.mentor_id = u.id AND a.is_active = true
			       JOIN xp_logs x ON x.user_id = a.id AND x.created_at >= ? AND x.created_at < ?
			       WHERE u.is_active = true
			       GROUP BY u.id
			       HAVING COALESCE(SUM(x.amount), 0) > 0
			       ORDER BY metric DESC, u.created_at ASC, u.id ASC`
			args = []any{*start, *end}
		}
	default: // "xp"
		if start == nil {
			sql = `SELECT id AS user_id, full_name, username, avatar_url, current_level AS level, created_at,
			              total_xp AS metric
			       FROM users
			       WHERE is_active = true AND total_xp > 0
			       ORDER BY metric DESC, created_at ASC, id ASC`
		} else {
			sql = `SELECT u.id AS user_id, u.full_name, u.username, u.avatar_url, u.current_level AS level, u.created_at,
			              COALESCE(SUM(x.amount), 0) AS metric
			       FROM users u
			       JOIN xp_logs x ON x.user_id = u.id AND x.created_at >= ? AND x.created_at < ?
			       WHERE u.is_active = true
			       GROUP BY u.id
			       HAVING COALESCE(SUM(x.amount), 0) > 0
			       ORDER BY metric DESC, u.created_at ASC, u.id ASC`
			args = []any{*start, *end}
		}
	}

	err := config.DB.Raw(sql, args...).Scan(&rows).Error
	return rows, err
}

func getLeaderboard(leaderboardType, period string) ([]LeaderboardItem, error) {
	start, end, prevStart, prevEnd := periodBounds(period)

	current, err := queryMetricRows(leaderboardType, start, end)
	if err != nil {
		return nil, err
	}

	var prevRank map[uint]int
	if start != nil {
		previous, err := queryMetricRows(leaderboardType, prevStart, prevEnd)
		if err != nil {
			return nil, err
		}
		prevRank = make(map[uint]int, len(previous))
		for i, row := range previous {
			prevRank[row.UserID] = i + 1
		}
	}

	limit := min(len(current), 50)
	items := make([]LeaderboardItem, 0, limit)
	for i, row := range current[:limit] {
		rank := i + 1
		trend := "same"
		if prevRank != nil {
			if oldRank, ok := prevRank[row.UserID]; ok {
				switch {
				case rank < oldRank:
					trend = "up"
				case rank > oldRank:
					trend = "down"
				}
			} else {
				trend = "new"
			}
		}
		items = append(items, LeaderboardItem{
			Rank:   rank,
			User:   LeaderboardUser{ID: row.UserID, FullName: row.FullName, Username: row.Username, AvatarURL: row.AvatarURL, Level: row.Level},
			Metric: row.Metric,
			Trend:  trend,
		})
	}
	return items, nil
}
