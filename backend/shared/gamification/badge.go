package gamification

import (
	"time"

	"backend/config"
	"backend/shared/model"

	"gorm.io/gorm/clause"
)

type BadgeDefinition struct {
	ID            uint
	Slug          string
	Name          string
	Icon          string
	Color         string
	XPReward      int
	TriggerType   string
	Count         int // scroll_count, scroll_bookmarks, comment_count
	MinCategories int // category_count
	Weeks         int // streak
}

var badgeDefinitions = []BadgeDefinition{
	{1, "first-scroll", "First Scroll", "scroll-text", "#F59E0B", 50, "scroll_count", 1, 0, 0},
	{2, "lorekeeper", "Lorekeeper", "library", "#3B82F6", 200, "scroll_count", 10, 0, 0},
	{3, "cross-domain", "Cross-Domain Explorer", "globe", "#10B981", 100, "category_count", 0, 2, 0},
	{4, "mentor-blessing", "Mentor Blessing", "heart", "#EC4899", 75, "scroll_bookmarks", 5, 0, 0},
	{5, "bug-archaeologist", "Bug Archaeologist", "bug", "#EF4444", 50, "manual", 0, 0, 0},
	{6, "sop-guardian", "SOP Guardian", "shield", "#8B5CF6", 150, "manual", 0, 0, 0},
	{7, "weekly-scribe", "Weekly Scribe", "calendar-check", "#06B6D4", 100, "streak", 0, 0, 4},
	{8, "knowledge-catalyst", "Knowledge Catalyst", "message-circle", "#F97316", 50, "comment_count", 10, 0, 0},
}

type UnlockResult struct {
	Slug     string `json:"slug"`
	Name     string `json:"name"`
	Icon     string `json:"icon"`
	Color    string `json:"color"`
	XPReward int    `json:"xp_reward"`
	LevelUp  bool   `json:"level_up"`
	NewLevel int    `json:"new_level"`
}

type ProgressItem struct {
	Slug        string
	Name        string
	Icon        string
	Color       string
	PercentDone int
}

func AllBadgeDefinitions() []BadgeDefinition {
	return badgeDefinitions
}

func FindBadgeDefinition(slug string) (BadgeDefinition, bool) {
	for _, b := range badgeDefinitions {
		if b.Slug == slug {
			return b, true
		}
	}
	return BadgeDefinition{}, false
}

func requiredValue(b BadgeDefinition) int {
	switch b.TriggerType {
	case "category_count":
		return b.MinCategories
	case "streak":
		return b.Weeks
	default:
		return b.Count
	}
}

func countPublishedScrolls(userID uint) int {
	var count int64
	config.DB.Model(&model.Scroll{}).Where("author_id = ? AND status = ?", userID, model.ScrollStatusPublished).Count(&count)
	return int(count)
}

func countDistinctCategories(userID uint) int {
	var count int64
	config.DB.Model(&model.Scroll{}).
		Where("author_id = ? AND status = ?", userID, model.ScrollStatusPublished).
		Distinct("category_id").Count(&count)
	return int(count)
}

func countBookmarksReceived(userID uint) int {
	var count int64
	config.DB.Model(&model.Bookmark{}).
		Joins("JOIN scrolls ON scrolls.id = bookmarks.scroll_id").
		Where("scrolls.author_id = ? AND bookmarks.user_id <> ?", userID, userID).
		Count(&count)
	return int(count)
}

func countDistinctScrollsCommented(userID uint) int {
	var count int64
	config.DB.Model(&model.Comment{}).Where("author_id = ?", userID).Distinct("scroll_id").Count(&count)
	return int(count)
}

func weeklyScrollStreak(userID uint) int {
	loc := JakartaLocation()

	var scrolls []model.Scroll
	config.DB.Select("published_at").
		Where("author_id = ? AND status = ?", userID, model.ScrollStatusPublished).
		Find(&scrolls)

	weeks := map[string]bool{}
	for _, s := range scrolls {
		if s.PublishedAt == nil {
			continue
		}
		weeks[mondayOfWeek(s.PublishedAt.In(loc)).Format("2006-01-02")] = true
	}

	streak := 0
	cursor := mondayOfWeek(time.Now().In(loc))
	for weeks[cursor.Format("2006-01-02")] {
		streak++
		cursor = cursor.AddDate(0, 0, -7)
	}
	return streak
}

func mondayOfWeek(t time.Time) time.Time {
	weekday := int(t.Weekday())
	if weekday == 0 {
		weekday = 7
	}
	daysSinceMonday := weekday - 1
	d := t.AddDate(0, 0, -daysSinceMonday)
	return time.Date(d.Year(), d.Month(), d.Day(), 0, 0, 0, 0, t.Location())
}

func currentBadgeCount(userID uint, b BadgeDefinition) int {
	switch b.TriggerType {
	case "scroll_count":
		return countPublishedScrolls(userID)
	case "category_count":
		return countDistinctCategories(userID)
	case "scroll_bookmarks":
		return countBookmarksReceived(userID)
	case "comment_count":
		return countDistinctScrollsCommented(userID)
	case "streak":
		return weeklyScrollStreak(userID)
	default:
		return 0
	}
}

// Unlock records the badge (idempotent) and always attempts the XP award afterward,
// relying on Award's own idempotency rather than gating on whether the row was new —
// this stays correct under retry even if Award failed on a previous attempt.
func Unlock(userID uint, b BadgeDefinition, grantedBy *uint) (UnlockResult, error) {
	ub := model.UserBadge{UserID: userID, BadgeSlug: b.Slug, UnlockedAt: time.Now(), GrantedBy: grantedBy}
	if err := config.DB.Clauses(clause.OnConflict{DoNothing: true}).Create(&ub).Error; err != nil {
		return UnlockResult{}, err
	}

	awardResult, err := Award(userID, b.XPReward, "badge_unlocked", "badge", b.ID)
	if err != nil {
		return UnlockResult{}, err
	}

	return UnlockResult{
		Slug:     b.Slug,
		Name:     b.Name,
		Icon:     b.Icon,
		Color:    b.Color,
		XPReward: b.XPReward,
		LevelUp:  awardResult.LeveledUp,
		NewLevel: awardResult.NewLevel,
	}, nil
}

func Evaluate(userID uint, triggers ...string) ([]UnlockResult, error) {
	triggerSet := map[string]bool{}
	for _, t := range triggers {
		triggerSet[t] = true
	}

	var unlocked []UnlockResult
	for range 3 {
		var owned []model.UserBadge
		config.DB.Where("user_id = ?", userID).Find(&owned)
		ownedSlugs := map[string]bool{}
		for _, ub := range owned {
			ownedSlugs[ub.BadgeSlug] = true
		}

		newThisRound := false
		for _, b := range badgeDefinitions {
			if b.TriggerType == "manual" || !triggerSet[b.TriggerType] || ownedSlugs[b.Slug] {
				continue
			}
			if currentBadgeCount(userID, b) < requiredValue(b) {
				continue
			}
			result, err := Unlock(userID, b, nil)
			if err != nil {
				return unlocked, err
			}
			unlocked = append(unlocked, result)
			newThisRound = true
		}
		if !newThisRound {
			break
		}
	}
	return unlocked, nil
}

type MyBadgeItem struct {
	Slug        string
	Name        string
	Icon        string
	Color       string
	XPReward    int
	Unlocked    bool
	UnlockedAt  *time.Time
	PercentDone *int
}

func MyBadges(userID uint) ([]MyBadgeItem, error) {
	var owned []model.UserBadge
	if err := config.DB.Where("user_id = ?", userID).Find(&owned).Error; err != nil {
		return nil, err
	}
	unlockedAt := map[string]time.Time{}
	for _, ub := range owned {
		unlockedAt[ub.BadgeSlug] = ub.UnlockedAt
	}

	items := make([]MyBadgeItem, 0, len(badgeDefinitions))
	for _, b := range badgeDefinitions {
		if ts, ok := unlockedAt[b.Slug]; ok {
			items = append(items, MyBadgeItem{Slug: b.Slug, Name: b.Name, Icon: b.Icon, Color: b.Color, XPReward: b.XPReward, Unlocked: true, UnlockedAt: &ts})
			continue
		}

		item := MyBadgeItem{Slug: b.Slug, Name: b.Name, Icon: b.Icon, Color: b.Color, XPReward: b.XPReward, Unlocked: false}
		if b.TriggerType != "manual" {
			required := requiredValue(b)
			percent := 0
			if required > 0 {
				percent = min(100, currentBadgeCount(userID, b)*100/required)
			}
			item.PercentDone = &percent
		}
		items = append(items, item)
	}
	return items, nil
}

func Progress(userID uint) ([]ProgressItem, error) {
	var owned []model.UserBadge
	if err := config.DB.Where("user_id = ?", userID).Find(&owned).Error; err != nil {
		return nil, err
	}
	ownedSlugs := map[string]bool{}
	for _, ub := range owned {
		ownedSlugs[ub.BadgeSlug] = true
	}

	var items []ProgressItem
	for _, b := range badgeDefinitions {
		if b.TriggerType == "manual" || ownedSlugs[b.Slug] {
			continue
		}
		required := requiredValue(b)
		percent := 0
		if required > 0 {
			percent = min(100, currentBadgeCount(userID, b)*100/required)
		}
		items = append(items, ProgressItem{Slug: b.Slug, Name: b.Name, Icon: b.Icon, Color: b.Color, PercentDone: percent})
	}
	return items, nil
}
