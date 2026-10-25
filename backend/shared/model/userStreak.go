package model

import "time"

type UserStreak struct {
	UserID           uint      `gorm:"primaryKey;autoIncrement:false"`
	StreakType       string    `gorm:"primaryKey;autoIncrement:false"`
	CurrentCount     int       `gorm:"not null;default:0"`
	LongestCount     int       `gorm:"not null;default:0"`
	LastActivityDate time.Time `gorm:"type:date"`
}
