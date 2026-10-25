package gamification

import (
	"log"
	"time"

	"backend/config"
	"backend/shared/model"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type TouchResult struct {
	Count       int
	Incremented bool
}

func periodStartFor(streakType string, t time.Time) time.Time {
	loc := JakartaLocation()
	t = t.In(loc)
	if streakType == "weekly_scroll" {
		return mondayOfWeek(t)
	}
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, loc)
}

func previousPeriod(streakType string, periodStart time.Time) time.Time {
	if streakType == "weekly_scroll" {
		return periodStart.AddDate(0, 0, -7)
	}
	return periodStart.AddDate(0, 0, -1)
}

func daysSinceEpoch(t time.Time) uint {
	epoch := time.Date(2020, 1, 1, 0, 0, 0, 0, t.Location())
	return uint(t.Sub(epoch).Hours() / 24)
}

func Touch(userID uint, streakType string, now time.Time) (TouchResult, error) {
	periodStart := periodStartFor(streakType, now)
	prevPeriod := previousPeriod(streakType, periodStart)

	var result TouchResult
	err := config.DB.Transaction(func(tx *gorm.DB) error {
		row := model.UserStreak{UserID: userID, StreakType: streakType}
		if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&row).Error; err != nil {
			return err
		}
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("user_id = ? AND streak_type = ?", userID, streakType).First(&row).Error; err != nil {
			return err
		}

		lastPeriod := periodStartFor(streakType, row.LastActivityDate)

		switch {
		case lastPeriod.Equal(periodStart):
			result = TouchResult{Count: row.CurrentCount, Incremented: false}
			return nil
		case lastPeriod.Equal(prevPeriod):
			row.CurrentCount++
		default:
			row.CurrentCount = 1
		}

		if row.CurrentCount > row.LongestCount {
			row.LongestCount = row.CurrentCount
		}
		row.LastActivityDate = periodStart
		if err := tx.Model(&row).Updates(map[string]any{
			"current_count":      row.CurrentCount,
			"longest_count":      row.LongestCount,
			"last_activity_date": row.LastActivityDate,
		}).Error; err != nil {
			return err
		}
		result = TouchResult{Count: row.CurrentCount, Incremented: true}
		return nil
	})
	if err != nil {
		return TouchResult{}, err
	}

	if streakType == "daily_login" && result.Incremented {
		amount := min(5*result.Count, 50)
		if _, awardErr := Award(userID, amount, "login_streak", "streak", daysSinceEpoch(periodStart)); awardErr != nil {
			log.Println("Failed to award login streak XP:", awardErr)
		}
	}
	return result, nil
}

type StreakInfo struct {
	Type   string `json:"type"`
	Count  int    `json:"count"`
	AtRisk bool   `json:"at_risk"`
}

var streakTypes = []string{"daily_login", "weekly_scroll", "daily_read"}

// Streaks reports every streak type; AtRisk means the streak is alive but nothing happened in the current period yet.
func Streaks(userID uint, now time.Time) []StreakInfo {
	out := make([]StreakInfo, 0, len(streakTypes))
	for _, t := range streakTypes {
		info := StreakInfo{Type: t}
		var row model.UserStreak
		if err := config.DB.Where("user_id = ? AND streak_type = ?", userID, t).First(&row).Error; err == nil {
			periodStart := periodStartFor(t, now)
			lastPeriod := periodStartFor(t, row.LastActivityDate)
			switch {
			case lastPeriod.Equal(periodStart):
				info.Count = row.CurrentCount
			case lastPeriod.Equal(previousPeriod(t, periodStart)):
				info.Count = row.CurrentCount
				info.AtRisk = true
			}
		}
		out = append(out, info)
	}
	return out
}

func CurrentCount(userID uint, streakType string, now time.Time) int {
	var row model.UserStreak
	if err := config.DB.Where("user_id = ? AND streak_type = ?", userID, streakType).First(&row).Error; err != nil {
		return 0
	}

	periodStart := periodStartFor(streakType, now)
	prevPeriod := previousPeriod(streakType, periodStart)
	lastPeriod := periodStartFor(streakType, row.LastActivityDate)

	if lastPeriod.Equal(periodStart) || lastPeriod.Equal(prevPeriod) {
		return row.CurrentCount
	}
	return 0
}
