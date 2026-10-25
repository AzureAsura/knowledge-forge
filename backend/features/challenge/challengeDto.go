package challenge

import (
	"time"

	"backend/shared/model"
)

type CreateChallengeInput struct {
	Title       string    `json:"title" binding:"required"`
	Description string    `json:"description"`
	CategoryID  *uint     `json:"category_id"`
	XPReward    int       `json:"xp_reward" binding:"required,gt=0"`
	StartDate   time.Time `json:"start_date" binding:"required"`
	EndDate     time.Time `json:"end_date" binding:"required"`
	IsPublished bool      `json:"is_published"`
}

type UpdateChallengeInput struct {
	Title       *string    `json:"title"`
	Description *string    `json:"description"`
	CategoryID  *uint      `json:"category_id"`
	XPReward    *int       `json:"xp_reward" binding:"omitempty,gt=0"`
	StartDate   *time.Time `json:"start_date"`
	EndDate     *time.Time `json:"end_date"`
	IsPublished *bool      `json:"is_published"`
}

type SubmitChallengeInput struct {
	ProofURL string `json:"proof_url" binding:"required"`
	Notes    string `json:"notes"`
}

type ReviewSubmissionInput struct {
	Status       string `json:"status" binding:"required,oneof=approved rejected"`
	RejectReason string `json:"reject_reason" binding:"omitempty,max=500"`
}

type ChallengeResponse struct {
	model.Challenge
	Status             string  `json:"status"`
	MySubmissionStatus *string `json:"my_submission_status,omitempty"`
}

type SubmissionResponse struct {
	model.ChallengeSubmission
	ChallengeTitle string `json:"challenge_title"`
	Username       string `json:"username"`
}

type ReviewResult struct {
	XPGained int  `json:"xp_gained"`
	LevelUp  bool `json:"level_up"`
	NewLevel int  `json:"new_level"`
}
