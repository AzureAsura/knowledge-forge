package model

import "time"

type ScrollRead struct {
	ScrollID    uint `gorm:"primaryKey;autoIncrement:false"`
	UserID      uint `gorm:"primaryKey;autoIncrement:false"`
	FirstReadAt time.Time
}
