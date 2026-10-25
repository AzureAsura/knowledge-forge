package model

import "time"

type RateLimit struct {
	Key         string    `gorm:"primaryKey"`
	WindowStart time.Time `gorm:"primaryKey"`
	Count       int       `gorm:"not null;default:0"`
}
