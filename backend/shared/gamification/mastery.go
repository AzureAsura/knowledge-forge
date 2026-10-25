package gamification

import (
	"fmt"
	"time"

	"backend/config"
	"backend/shared/model"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const MaxLevel = 5

var levelRequirements = []struct {
	Level       int
	XP          int
	Contributed int
	Read        int
	BonusXP     int
}{
	{1, 50, 1, 3, 10},
	{2, 150, 3, 8, 25},
	{3, 350, 6, 15, 50},
	{4, 700, 10, 25, 100},
	{5, 1200, 15, 40, 200},
}

func GetLeafCategories() ([]model.Category, error) {
	var categories []model.Category
	err := config.DB.Where("is_active = ?", true).
		Where("id NOT IN (?)", config.DB.Model(&model.Category{}).Where("parent_id IS NOT NULL").Distinct().Select("parent_id")).
		Order("id").Find(&categories).Error
	return categories, err
}

func GetTopicLevelRequirements(level int) (xpNeeded, contributed, read int) {
	for _, r := range levelRequirements {
		if r.Level == level {
			return r.XP, r.Contributed, r.Read
		}
	}
	return 0, 0, 0
}

func bonusForLevel(level int) int {
	for _, r := range levelRequirements {
		if r.Level == level {
			return r.BonusXP
		}
	}
	return 0
}

// TopicLevelBonus is the one-time XP bonus for reaching the given topic level.
func TopicLevelBonus(level int) int { return bonusForLevel(level) }

type TopicResult struct {
	LevelUp      bool   `json:"level_up"`
	From         int    `json:"from"`
	To           int    `json:"to"`
	BonusXP      int    `json:"bonus_xp"`
	CategorySlug string `json:"category_slug"`
	UserLevelUp  bool   `json:"user_level_up"`
	UserNewLevel int    `json:"user_new_level"`
}

func getOrCreateTopicMastery(tx *gorm.DB, userID, categoryID uint) (model.TopicMastery, error) {
	row := model.TopicMastery{UserID: userID, CategoryID: categoryID}
	if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&row).Error; err != nil {
		return model.TopicMastery{}, err
	}
	var out model.TopicMastery
	err := tx.Where("user_id = ? AND category_id = ?", userID, categoryID).First(&out).Error
	return out, err
}

func AddTopicXP(userID, categoryID uint, amount int) error {
	if amount <= 0 {
		return nil
	}
	return config.DB.Transaction(func(tx *gorm.DB) error {
		row, err := getOrCreateTopicMastery(tx, userID, categoryID)
		if err != nil {
			return err
		}
		now := time.Now()
		return tx.Model(&row).Updates(map[string]any{
			"xp_in_topic":      row.XPInTopic + amount,
			"last_activity_at": &now,
		}).Error
	})
}

func IncContributed(userID, categoryID uint) error {
	return config.DB.Transaction(func(tx *gorm.DB) error {
		row, err := getOrCreateTopicMastery(tx, userID, categoryID)
		if err != nil {
			return err
		}
		return tx.Model(&row).Update("scrolls_contributed", row.ScrollsContributed+1).Error
	})
}

func IncRead(userID, categoryID uint) error {
	return config.DB.Transaction(func(tx *gorm.DB) error {
		row, err := getOrCreateTopicMastery(tx, userID, categoryID)
		if err != nil {
			return err
		}
		return tx.Model(&row).Update("scrolls_read", row.ScrollsRead+1).Error
	})
}

func CheckTopicLevelUp(userID, categoryID uint) (TopicResult, error) {
	var result TopicResult
	err := config.DB.Transaction(func(tx *gorm.DB) error {
		row, err := getOrCreateTopicMastery(tx, userID, categoryID)
		if err != nil {
			return err
		}
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("user_id = ? AND category_id = ?", userID, categoryID).
			First(&row).Error; err != nil {
			return err
		}

		fromLevel := row.Level
		currentLevel := row.Level
		totalBonus := 0
		userLevelUp := false
		userNewLevel := 0

		for currentLevel < MaxLevel {
			nextLevel := currentLevel + 1
			xpNeeded, contributedNeeded, readNeeded := GetTopicLevelRequirements(nextLevel)
			if row.XPInTopic < xpNeeded || row.ScrollsContributed < contributedNeeded || row.ScrollsRead < readNeeded {
				break
			}

			bonus := bonusForLevel(nextLevel)
			awardResult, err := Award(userID, bonus, fmt.Sprintf("topic_level_%d", nextLevel), "topic_mastery", row.ID)
			if err != nil {
				return err
			}
			if awardResult.Applied {
				totalBonus += bonus
			}
			if awardResult.LeveledUp {
				userLevelUp = true
			}
			userNewLevel = awardResult.NewLevel
			currentLevel = nextLevel
		}

		if currentLevel != fromLevel {
			if err := tx.Model(&row).Update("level", currentLevel).Error; err != nil {
				return err
			}
		}

		var category model.Category
		tx.First(&category, categoryID)

		result = TopicResult{
			LevelUp:      currentLevel != fromLevel,
			From:         fromLevel,
			To:           currentLevel,
			BonusXP:      totalBonus,
			CategorySlug: category.Slug,
			UserLevelUp:  userLevelUp,
			UserNewLevel: userNewLevel,
		}
		return nil
	})
	return result, err
}
