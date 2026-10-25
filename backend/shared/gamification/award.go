package gamification

import (
	"errors"

	"backend/config"
	"backend/shared/model"
	"backend/shared/utils"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type AwardResult struct {
	Applied   bool
	XPGained  int
	TotalXP   int
	OldLevel  int
	NewLevel  int
	LeveledUp bool
	Title     string
}

// Award credits XP to a user atomically. It is idempotent on (userID, reason, sourceID):
// sourceID must uniquely identify the triggering event (not just the resource), so calling
// Award again with the same (userID, reason, sourceID) is always a safe no-op.
func Award(userID uint, amount int, reason, sourceType string, sourceID uint) (AwardResult, error) {
	if amount <= 0 {
		return AwardResult{}, errors.New("xp amount must be positive")
	}

	var result AwardResult
	err := config.DB.Transaction(func(tx *gorm.DB) error {
		logEntry := model.XPLog{UserID: userID, Amount: amount, Reason: reason, SourceType: sourceType, SourceID: sourceID}
		insert := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&logEntry)
		if insert.Error != nil {
			return insert.Error
		}

		var user model.User
		if insert.RowsAffected == 0 {
			if err := tx.First(&user, userID).Error; err != nil {
				return err
			}
			result = AwardResult{Applied: false, TotalXP: user.TotalXP, OldLevel: user.CurrentLevel, NewLevel: user.CurrentLevel, Title: user.Title}
			return nil
		}

		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&user, userID).Error; err != nil {
			return err
		}
		oldLevel := user.CurrentLevel
		newTotalXP := user.TotalXP + amount
		newLevel, newTitle, _, _ := utils.LevelFromTotalXP(newTotalXP)

		if err := tx.Model(&user).Updates(map[string]any{
			"total_xp": newTotalXP, "current_level": newLevel, "title": newTitle,
		}).Error; err != nil {
			return err
		}

		result = AwardResult{Applied: true, XPGained: amount, TotalXP: newTotalXP, OldLevel: oldLevel, NewLevel: newLevel, LeveledUp: newLevel > oldLevel, Title: newTitle}
		return nil
	})
	return result, err
}
