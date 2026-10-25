package model

import "time"

type TopicMastery struct {
	ID                 uint `gorm:"primaryKey"`
	UserID             uint `gorm:"not null;index;uniqueIndex:idx_topic_mastery_user_category"`
	CategoryID         uint `gorm:"not null;index;uniqueIndex:idx_topic_mastery_user_category"`
	Level              int  `gorm:"not null;default:0"`
	XPInTopic          int  `gorm:"not null;default:0"`
	ScrollsContributed int  `gorm:"not null;default:0"`
	ScrollsRead        int  `gorm:"not null;default:0"`
	LastActivityAt     *time.Time
}
