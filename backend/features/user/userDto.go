package user

import (
	"time"

	"backend/shared/gamification"
	"backend/shared/view"
)

type CreateUserInput struct {
	FullName string `json:"full_name" binding:"required"`
	Username string `json:"username" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	Role     string `json:"role" binding:"required,oneof=scholar senior admin"`
}

type UpdateMeInput struct {
	FullName *string `json:"full_name"`
	Username *string `json:"username"`
	Bio      *string `json:"bio" binding:"omitempty,max=300"`
}

type PublicUserStats struct {
	PublishedScrolls int                       `json:"published_scrolls"`
	BadgesCount      int                       `json:"badges_count"`
	CurrentStreak    int                       `json:"current_streak"`
	Streaks          []gamification.StreakInfo `json:"streaks"`
}

type PublicUserResponse struct {
	ID        uint            `json:"id"`
	FullName  string          `json:"full_name"`
	Username  string          `json:"username"`
	AvatarURL string          `json:"avatar_url"`
	Bio       string          `json:"bio"`
	Role      string          `json:"role"`
	Level     int             `json:"level"`
	Title     string          `json:"title"`
	TotalXP   int             `json:"total_xp"`
	Mentor    *string         `json:"mentor"`
	CreatedAt time.Time       `json:"created_at"`
	Stats     PublicUserStats `json:"stats"`
}

type DashboardWelcome struct {
	FullName           string  `json:"full_name"`
	Level              int     `json:"level"`
	Title              string  `json:"title"`
	XPForNextLevel     int     `json:"xp_for_next_level"`
	ProgressPercentage float64 `json:"progress_percentage"`
}

type DashboardStats struct {
	TotalScrolls   int                       `json:"total_scrolls"`
	TotalXP        int                       `json:"total_xp"`
	BadgesUnlocked int                       `json:"badges_unlocked"`
	CurrentStreak  int                       `json:"current_streak"`
	Streaks        []gamification.StreakInfo `json:"streaks"`
}

type DashboardTopic struct {
	Name               string `json:"name"`
	Level              int    `json:"level"`
	ProgressPercentage int    `json:"progress_percentage"`
}

type UserBadgeItem struct {
	Slug       string    `json:"slug"`
	Name       string    `json:"name"`
	Icon       string    `json:"icon"`
	Color      string    `json:"color"`
	UnlockedAt time.Time `json:"unlocked_at"`
}

type DashboardChallenge struct {
	ID          uint      `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	XPReward    int       `json:"xp_reward"`
	EndDate     time.Time `json:"end_date"`
}

type DashboardResponse struct {
	Welcome         DashboardWelcome  `json:"welcome"`
	Stats           DashboardStats    `json:"stats"`
	RecentScrolls   []view.ScrollItem `json:"recent_scrolls"`
	TrendingScrolls []view.ScrollItem `json:"trending_scrolls"`
	Topics          []DashboardTopic  `json:"topics"`
	ChallengeActive any               `json:"challenge_active"`
}
