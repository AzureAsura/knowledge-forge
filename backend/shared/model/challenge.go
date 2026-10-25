package model

import "time"

const (
	ChallengeSubmissionPending  = "pending"
	ChallengeSubmissionApproved = "approved"
	ChallengeSubmissionRejected = "rejected"
)

type Challenge struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Title       string    `gorm:"not null" json:"title"`
	Description string    `json:"description"`
	CategoryID  *uint     `gorm:"index" json:"category_id"`
	XPReward    int       `gorm:"not null" json:"xp_reward"`
	StartDate   time.Time `gorm:"not null" json:"start_date"`
	EndDate     time.Time `gorm:"not null" json:"end_date"`
	IsPublished bool      `gorm:"not null;default:false" json:"is_published"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type ChallengeSubmission struct {
	ID           uint       `gorm:"primaryKey" json:"id"`
	ChallengeID  uint       `gorm:"not null;uniqueIndex:idx_challenge_submission_challenge_user" json:"challenge_id"`
	UserID       uint       `gorm:"not null;uniqueIndex:idx_challenge_submission_challenge_user" json:"user_id"`
	ProofURL     string     `gorm:"not null" json:"proof_url"`
	Notes        string     `json:"notes"`
	Status       string     `gorm:"not null;default:pending" json:"status"`
	RejectReason string     `json:"reject_reason"`
	ReviewedBy   *uint      `json:"reviewed_by"`
	ReviewedAt   *time.Time `json:"reviewed_at"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}
