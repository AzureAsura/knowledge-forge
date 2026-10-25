package apprentice

import "time"

type FollowInput struct {
	MentorID uint `json:"mentor_id" binding:"required"`
}

type MentorSummary struct {
	ID        uint   `json:"id"`
	FullName  string `json:"full_name"`
	Username  string `json:"username"`
	AvatarURL string `json:"avatar_url"`
	Level     int    `json:"level"`
}

type ApprenticeRow struct {
	UserID                uint      `json:"id"`
	FullName              string    `json:"full_name"`
	Username              string    `json:"username"`
	Level                 int       `json:"level"`
	PublishedScrollsCount int64     `json:"published_scrolls_count"`
	JoinedAt              time.Time `json:"joined_at"`
}
