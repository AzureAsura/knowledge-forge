package apprentice

import (
	"errors"
	"time"

	"backend/config"
	"backend/shared/model"
)

var (
	ErrCannotFollowSelf  = errors.New("cannot follow yourself")
	ErrInvalidMentorRole = errors.New("mentor must be senior or admin")
	ErrAlreadyHasMentor  = errors.New("already have a mentor")
	ErrMentorNotFound    = errors.New("mentor not found")
)

func follow(scholarID, mentorID uint) error {
	if scholarID == mentorID {
		return ErrCannotFollowSelf
	}

	var scholar model.User
	if err := config.DB.First(&scholar, scholarID).Error; err != nil {
		return err
	}
	if scholar.MentorID != nil {
		return ErrAlreadyHasMentor
	}

	var mentor model.User
	if err := config.DB.Where("id = ? AND is_active = ?", mentorID, true).First(&mentor).Error; err != nil {
		return ErrMentorNotFound
	}
	if mentor.Role != model.RoleSenior && mentor.Role != model.RoleAdmin {
		return ErrInvalidMentorRole
	}

	return config.DB.Model(&model.User{}).Where("id = ?", scholarID).
		Updates(map[string]any{"mentor_id": mentorID, "mentor_since": time.Now()}).Error
}

func unfollow(scholarID uint) error {
	return config.DB.Model(&model.User{}).Where("id = ?", scholarID).
		Updates(map[string]any{"mentor_id": nil, "mentor_since": nil}).Error
}

func getMentor(scholarID uint) (*MentorSummary, error) {
	var scholar model.User
	if err := config.DB.First(&scholar, scholarID).Error; err != nil {
		return nil, err
	}
	if scholar.MentorID == nil {
		return nil, nil
	}

	var mentor model.User
	if err := config.DB.Where("id = ? AND is_active = ?", *scholar.MentorID, true).First(&mentor).Error; err != nil {
		return nil, nil
	}

	return &MentorSummary{
		ID:        mentor.ID,
		FullName:  mentor.FullName,
		Username:  mentor.Username,
		AvatarURL: mentor.AvatarURL,
		Level:     mentor.CurrentLevel,
	}, nil
}

func getApprentices(mentorID uint) ([]ApprenticeRow, error) {
	rows := []ApprenticeRow{} // never nil: an empty list must serialise as [], not null
	err := config.DB.Raw(`
		SELECT u.id AS user_id, u.full_name, u.username, u.current_level AS level,
		       COUNT(s.id) AS published_scrolls_count, u.created_at AS joined_at
		FROM users u
		LEFT JOIN scrolls s ON s.author_id = u.id AND s.status = 'published'
		WHERE u.mentor_id = ? AND u.is_active = true
		GROUP BY u.id
		ORDER BY u.created_at ASC
	`, mentorID).Scan(&rows).Error
	return rows, err
}
