package user

import (
	"errors"
	"log"
	"math"
	"time"

	"backend/config"
	"backend/shared/gamification"
	"backend/shared/model"
	"backend/shared/utils"
	"backend/shared/view"

	"gorm.io/gorm/clause"
)

var ErrUsernameTaken = errors.New("username already taken")

func createUser(input CreateUserInput) (model.User, error) {
	var existing model.User
	if err := config.DB.Where("email = ? OR username = ?", input.Email, input.Username).First(&existing).Error; err == nil {
		return model.User{}, errors.New("email or username already in use")
	}

	hashed, err := utils.HashPassword(input.Password)
	if err != nil {
		return model.User{}, err
	}

	user := model.User{
		FullName:     input.FullName,
		Username:     input.Username,
		Email:        input.Email,
		PasswordHash: hashed,
		Role:         input.Role,
		IsActive:     true,
	}
	if err := config.DB.Create(&user).Error; err != nil {
		return model.User{}, err
	}

	return user, nil
}

func getPublicUser(username, callerRole string, callerID uint) (PublicUserResponse, error) {
	var target model.User
	if err := config.DB.Where("username = ?", username).First(&target).Error; err != nil {
		return PublicUserResponse{}, errors.New("user not found")
	}
	if !target.IsActive && callerRole != model.RoleAdmin {
		return PublicUserResponse{}, errors.New("user not found")
	}

	recordProfileVisit(target.ID, callerID)

	level, title, _, _ := utils.LevelFromTotalXP(target.TotalXP)

	var publishedScrolls int64
	config.DB.Model(&model.Scroll{}).Where("author_id = ? AND status = ?", target.ID, model.ScrollStatusPublished).Count(&publishedScrolls)

	var badgesCount int64
	config.DB.Model(&model.UserBadge{}).Where("user_id = ?", target.ID).Count(&badgesCount)

	streak := gamification.CurrentCount(target.ID, "daily_login", time.Now())

	var mentorUsername *string
	if target.MentorID != nil {
		var mentor model.User
		if err := config.DB.Where("id = ? AND is_active = ?", *target.MentorID, true).First(&mentor).Error; err == nil {
			mentorUsername = &mentor.Username
		}
	}

	return PublicUserResponse{
		ID:        target.ID,
		FullName:  target.FullName,
		Username:  target.Username,
		AvatarURL: target.AvatarURL,
		Bio:       target.Bio,
		Role:      target.Role,
		Level:     level,
		Title:     title,
		TotalXP:   target.TotalXP,
		Mentor:    mentorUsername,
		CreatedAt: target.CreatedAt,
		Stats: PublicUserStats{
			PublishedScrolls: int(publishedScrolls),
			BadgesCount:      int(badgesCount),
			CurrentStreak:    streak,
			Streaks:          gamification.Streaks(target.ID, time.Now()),
		},
	}, nil
}

// recordProfileVisit counts one visit per visitor per day (Asia/Jakarta); opening your own profile is not a visit.
func recordProfileVisit(profileID, visitorID uint) {
	if profileID == visitorID {
		return
	}
	loc := gamification.JakartaLocation()
	now := time.Now().In(loc)
	day := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, loc)

	visit := model.ProfileVisit{ProfileUserID: profileID, VisitorID: visitorID, VisitDate: day}
	if err := config.DB.Clauses(clause.OnConflict{DoNothing: true}).Create(&visit).Error; err != nil {
		log.Println("Failed to record profile visit:", err)
	}
}

func getUserBadges(username, callerRole string) ([]UserBadgeItem, error) {
	var target model.User
	if err := config.DB.Where("username = ?", username).First(&target).Error; err != nil {
		return nil, errors.New("user not found")
	}
	if !target.IsActive && callerRole != model.RoleAdmin {
		return nil, errors.New("user not found")
	}

	var owned []model.UserBadge
	config.DB.Where("user_id = ?", target.ID).Order("unlocked_at asc").Find(&owned)

	items := make([]UserBadgeItem, 0, len(owned))
	for _, ub := range owned {
		b, ok := gamification.FindBadgeDefinition(ub.BadgeSlug)
		if !ok {
			continue
		}
		items = append(items, UserBadgeItem{Slug: b.Slug, Name: b.Name, Icon: b.Icon, Color: b.Color, UnlockedAt: ub.UnlockedAt})
	}
	return items, nil
}

func updateMe(userID uint, input UpdateMeInput) (model.User, error) {
	var user model.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		return model.User{}, errors.New("user not found")
	}

	updates := map[string]any{}
	if input.FullName != nil {
		updates["full_name"] = *input.FullName
	}
	if input.Username != nil && *input.Username != user.Username {
		var existing model.User
		if err := config.DB.Where("username = ? AND id != ?", *input.Username, userID).First(&existing).Error; err == nil {
			return model.User{}, ErrUsernameTaken
		}
		updates["username"] = *input.Username
	}
	if input.Bio != nil {
		updates["bio"] = *input.Bio
	}

	if len(updates) > 0 {
		if err := config.DB.Model(&user).Updates(updates).Error; err != nil {
			return model.User{}, err
		}
		config.DB.First(&user, userID)
	}

	user.PasswordHash = ""
	return user, nil
}

func getDashboard(userID uint) (DashboardResponse, error) {
	var user model.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		return DashboardResponse{}, errors.New("user not found")
	}

	level, title, xpIntoLevel, xpForNextLevel := utils.LevelFromTotalXP(user.TotalXP)
	progress := 100.0
	if xpForNextLevel > 0 {
		progress = math.Round(float64(xpIntoLevel)/float64(xpForNextLevel)*1000) / 10
	}

	var totalScrolls int64
	config.DB.Model(&model.Scroll{}).Where("author_id = ? AND status = ?", userID, model.ScrollStatusPublished).Count(&totalScrolls)

	var badgesUnlocked int64
	config.DB.Model(&model.UserBadge{}).Where("user_id = ?", userID).Count(&badgesUnlocked)

	streak := gamification.CurrentCount(userID, "daily_login", time.Now())

	var recentScrolls []model.Scroll
	config.DB.Where("status = ?", model.ScrollStatusPublished).Order("published_at desc").Limit(5).Find(&recentScrolls)

	sevenDaysAgo := time.Now().Add(-7 * 24 * time.Hour)
	var trendingScrolls []model.Scroll
	config.DB.Model(&model.Scroll{}).
		Select("scrolls.*, COUNT(likes.id) AS recent_like_count").
		Joins("JOIN likes ON likes.scroll_id = scrolls.id AND likes.created_at >= ?", sevenDaysAgo).
		Where("scrolls.status = ?", model.ScrollStatusPublished).
		Group("scrolls.id").
		Order("recent_like_count DESC").
		Limit(3).
		Find(&trendingScrolls)

	recentItems, err := view.Scrolls(recentScrolls)
	if err != nil {
		return DashboardResponse{}, err
	}
	trendingItems, err := view.Scrolls(trendingScrolls)
	if err != nil {
		return DashboardResponse{}, err
	}

	categories, err := gamification.GetLeafCategories()
	if err != nil {
		return DashboardResponse{}, err
	}
	var masteries []model.TopicMastery
	config.DB.Where("user_id = ?", userID).Find(&masteries)
	byCategory := map[uint]model.TopicMastery{}
	for _, m := range masteries {
		byCategory[m.CategoryID] = m
	}

	topics := make([]DashboardTopic, 0, len(categories))
	for _, c := range categories {
		m := byCategory[c.ID]
		nextLevel := min(m.Level+1, gamification.MaxLevel)
		xpForNext, _, _ := gamification.GetTopicLevelRequirements(nextLevel)
		topicProgress := 100
		if m.Level < gamification.MaxLevel && xpForNext > 0 {
			topicProgress = min(int(math.Round(float64(m.XPInTopic)/float64(xpForNext)*100)), 100)
		}
		topics = append(topics, DashboardTopic{Name: c.Name, Level: m.Level, ProgressPercentage: topicProgress})
	}

	var challengeActive any
	var activeChallenge model.Challenge
	now := time.Now()
	if err := config.DB.Where("is_published = ? AND start_date <= ? AND end_date >= ?", true, now, now).
		Order("start_date desc").First(&activeChallenge).Error; err == nil {
		challengeActive = DashboardChallenge{
			ID:          activeChallenge.ID,
			Title:       activeChallenge.Title,
			Description: activeChallenge.Description,
			XPReward:    activeChallenge.XPReward,
			EndDate:     activeChallenge.EndDate,
		}
	}

	return DashboardResponse{
		Welcome: DashboardWelcome{
			FullName:           user.FullName,
			Level:              level,
			Title:              title,
			XPForNextLevel:     xpForNextLevel,
			ProgressPercentage: progress,
		},
		Stats: DashboardStats{
			TotalScrolls:   int(totalScrolls),
			TotalXP:        user.TotalXP,
			BadgesUnlocked: int(badgesUnlocked),
			CurrentStreak:  streak,
			Streaks:        gamification.Streaks(userID, time.Now()),
		},
		RecentScrolls:   recentItems,
		TrendingScrolls: trendingItems,
		Topics:          topics,
		ChallengeActive: challengeActive,
	}, nil
}
