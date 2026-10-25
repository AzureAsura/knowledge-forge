package challenge

import (
	"errors"
	"strings"
	"time"

	"backend/config"
	"backend/shared/gamification"
	"backend/shared/model"

	"gorm.io/gorm/clause"
)

var (
	ErrChallengeNotFound  = errors.New("challenge not found")
	ErrSubmissionNotFound = errors.New("submission not found")
	ErrSubmissionClosed   = errors.New("challenge is not open for submission")
	ErrAlreadySubmitted   = errors.New("already submitted")
	ErrNotPending         = errors.New("submission is not pending")
	ErrCannotReviewOwn    = errors.New("cannot review your own submission")
)

func deriveStatus(c model.Challenge, now time.Time) string {
	switch {
	case now.Before(c.StartDate):
		return "upcoming"
	case now.After(c.EndDate):
		return "completed"
	default:
		return "active"
	}
}

func listChallenges(callerID uint, callerRole, scope string) ([]ChallengeResponse, error) {
	q := config.DB.Model(&model.Challenge{})
	if callerRole != model.RoleAdmin {
		q = q.Where("is_published = ?", true)
	}

	now := time.Now()
	switch scope {
	case "upcoming":
		q = q.Where("start_date > ?", now)
	case "completed":
		q = q.Where("end_date < ?", now)
	case "all":
	default:
		q = q.Where("start_date <= ? AND end_date >= ?", now, now)
	}

	var challenges []model.Challenge
	if err := q.Order("start_date desc").Find(&challenges).Error; err != nil {
		return nil, err
	}

	var submissions []model.ChallengeSubmission
	config.DB.Where("user_id = ?", callerID).Find(&submissions)
	statusByChallenge := map[uint]string{}
	for _, s := range submissions {
		statusByChallenge[s.ChallengeID] = s.Status
	}

	items := make([]ChallengeResponse, 0, len(challenges))
	for _, c := range challenges {
		item := ChallengeResponse{Challenge: c, Status: deriveStatus(c, now)}
		if st, ok := statusByChallenge[c.ID]; ok {
			item.MySubmissionStatus = &st
		}
		items = append(items, item)
	}
	return items, nil
}

func getChallenge(callerID uint, callerRole string, id uint) (ChallengeResponse, error) {
	q := config.DB.Model(&model.Challenge{})
	if callerRole != model.RoleAdmin {
		q = q.Where("is_published = ?", true)
	}

	var c model.Challenge
	if err := q.First(&c, id).Error; err != nil {
		return ChallengeResponse{}, ErrChallengeNotFound
	}

	item := ChallengeResponse{Challenge: c, Status: deriveStatus(c, time.Now())}
	var sub model.ChallengeSubmission
	if err := config.DB.Where("challenge_id = ? AND user_id = ?", id, callerID).First(&sub).Error; err == nil {
		item.MySubmissionStatus = &sub.Status
	}
	return item, nil
}

func createChallenge(input CreateChallengeInput) (model.Challenge, error) {
	if !input.EndDate.After(input.StartDate) {
		return model.Challenge{}, errors.New("end_date must be after start_date")
	}

	c := model.Challenge{
		Title:       input.Title,
		Description: input.Description,
		CategoryID:  input.CategoryID,
		XPReward:    input.XPReward,
		StartDate:   input.StartDate,
		EndDate:     input.EndDate,
		IsPublished: input.IsPublished,
	}
	if err := config.DB.Create(&c).Error; err != nil {
		return model.Challenge{}, err
	}
	return c, nil
}

func updateChallenge(id uint, input UpdateChallengeInput) (model.Challenge, error) {
	var c model.Challenge
	if err := config.DB.First(&c, id).Error; err != nil {
		return model.Challenge{}, ErrChallengeNotFound
	}

	startDate, endDate := c.StartDate, c.EndDate
	if input.StartDate != nil {
		startDate = *input.StartDate
	}
	if input.EndDate != nil {
		endDate = *input.EndDate
	}
	if !endDate.After(startDate) {
		return model.Challenge{}, errors.New("end_date must be after start_date")
	}

	updates := map[string]any{}
	if input.Title != nil {
		updates["title"] = *input.Title
	}
	if input.Description != nil {
		updates["description"] = *input.Description
	}
	if input.CategoryID != nil {
		updates["category_id"] = *input.CategoryID
	}
	if input.XPReward != nil {
		updates["xp_reward"] = *input.XPReward
	}
	if input.StartDate != nil {
		updates["start_date"] = *input.StartDate
	}
	if input.EndDate != nil {
		updates["end_date"] = *input.EndDate
	}
	if input.IsPublished != nil {
		updates["is_published"] = *input.IsPublished
	}

	if len(updates) > 0 {
		if err := config.DB.Model(&c).Updates(updates).Error; err != nil {
			return model.Challenge{}, err
		}
		config.DB.First(&c, id)
	}
	return c, nil
}

func submit(challengeID, userID uint, input SubmitChallengeInput) error {
	if !strings.HasPrefix(input.ProofURL, "https://") {
		return errors.New("proof_url must be an https url")
	}

	var c model.Challenge
	if err := config.DB.First(&c, challengeID).Error; err != nil {
		return ErrChallengeNotFound
	}
	if !c.IsPublished || deriveStatus(c, time.Now()) != "active" {
		return ErrSubmissionClosed
	}

	var existing model.ChallengeSubmission
	err := config.DB.Where("challenge_id = ? AND user_id = ?", challengeID, userID).First(&existing).Error
	if err == nil && existing.Status != model.ChallengeSubmissionRejected {
		return ErrAlreadySubmitted
	}

	submission := model.ChallengeSubmission{
		ChallengeID: challengeID,
		UserID:      userID,
		ProofURL:    input.ProofURL,
		Notes:       input.Notes,
		Status:      model.ChallengeSubmissionPending,
	}
	return config.DB.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "challenge_id"}, {Name: "user_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"proof_url", "notes", "status", "reject_reason", "reviewed_by", "reviewed_at"}),
	}).Create(&submission).Error
}

func listSubmissions(status string) ([]SubmissionResponse, error) {
	q := config.DB.Table("challenge_submissions AS cs").
		Select("cs.*, c.title AS challenge_title, u.username AS username").
		Joins("JOIN challenges c ON c.id = cs.challenge_id").
		Joins("JOIN users u ON u.id = cs.user_id").
		Order("cs.created_at desc")
	if status != "" {
		q = q.Where("cs.status = ?", status)
	}

	rows := []SubmissionResponse{} // never nil: an empty list must serialise as [], not null
	err := q.Scan(&rows).Error
	return rows, err
}

func reviewSubmission(reviewerID, submissionID uint, input ReviewSubmissionInput) (ReviewResult, error) {
	var sub model.ChallengeSubmission
	if err := config.DB.First(&sub, submissionID).Error; err != nil {
		return ReviewResult{}, ErrSubmissionNotFound
	}
	if sub.Status != model.ChallengeSubmissionPending {
		return ReviewResult{}, ErrNotPending
	}
	if sub.UserID == reviewerID {
		return ReviewResult{}, ErrCannotReviewOwn
	}

	now := time.Now()
	if input.Status == model.ChallengeSubmissionApproved {
		var c model.Challenge
		if err := config.DB.First(&c, sub.ChallengeID).Error; err != nil {
			return ReviewResult{}, ErrChallengeNotFound
		}
		if err := config.DB.Model(&sub).Updates(map[string]any{
			"status": model.ChallengeSubmissionApproved, "reviewed_by": reviewerID, "reviewed_at": &now,
		}).Error; err != nil {
			return ReviewResult{}, err
		}

		award, err := gamification.Award(sub.UserID, c.XPReward, "challenge_approved", "challenge", sub.ID)
		if err != nil {
			return ReviewResult{}, err
		}
		return ReviewResult{XPGained: award.XPGained, LevelUp: award.LeveledUp, NewLevel: award.NewLevel}, nil
	}

	if err := config.DB.Model(&sub).Updates(map[string]any{
		"status": model.ChallengeSubmissionRejected, "reject_reason": input.RejectReason,
		"reviewed_by": reviewerID, "reviewed_at": &now,
	}).Error; err != nil {
		return ReviewResult{}, err
	}
	return ReviewResult{}, nil
}
