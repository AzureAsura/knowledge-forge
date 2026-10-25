package gamification

import (
	"os"
	"time"

	"backend/config"
	"backend/shared/model"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// JakartaLocation returns the configured app timezone (env APP_TZ), defaulting to Asia/Jakarta.
func JakartaLocation() *time.Location {
	tz := os.Getenv("APP_TZ")
	loc, err := time.LoadLocation(tz)
	if err != nil {
		loc, _ = time.LoadLocation("Asia/Jakarta")
	}
	return loc
}

func jakartaToday() time.Time {
	loc := JakartaLocation()
	now := time.Now().In(loc)
	return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, loc)
}

// Consume atomically reserves up to `want` against a user's daily cap for `key`,
// returning how much was actually granted: min(want, cap - already_used), clamped to 0.
func Consume(userID uint, key string, want, cap int) (int, error) {
	if want <= 0 {
		return 0, nil
	}
	today := jakartaToday()

	var granted int
	err := config.DB.Transaction(func(tx *gorm.DB) error {
		counter := model.DailyXPCounter{UserID: userID, CounterDate: today, CounterKey: key}
		if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&counter).Error; err != nil {
			return err
		}

		var row model.DailyXPCounter
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("user_id = ? AND counter_date = ? AND counter_key = ?", userID, today, key).
			First(&row).Error; err != nil {
			return err
		}

		remaining := max(cap-row.Amount, 0)
		granted = min(want, remaining)
		if granted > 0 {
			if err := tx.Model(&row).Update("amount", row.Amount+granted).Error; err != nil {
				return err
			}
		}
		return nil
	})
	return granted, err
}
