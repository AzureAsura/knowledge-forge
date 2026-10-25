package model

import "time"

type RefreshToken struct {
	ID         uint      `gorm:"primaryKey"`
	UserID     uint      `gorm:"not null;index"`
	FamilyID   string    `gorm:"not null;index"`
	TokenHash  string    `gorm:"uniqueIndex;not null"`
	ExpiresAt  time.Time `gorm:"not null"`
	RevokedAt  *time.Time
	ReplacedBy *uint
	CreatedAt  time.Time
}
