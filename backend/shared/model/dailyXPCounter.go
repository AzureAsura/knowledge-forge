package model

import "time"

type DailyXPCounter struct {
	UserID      uint      `gorm:"primaryKey;autoIncrement:false"`
	CounterDate time.Time `gorm:"primaryKey;autoIncrement:false;type:date"`
	CounterKey  string    `gorm:"primaryKey;autoIncrement:false"`
	Amount      int       `gorm:"not null;default:0"`
}
