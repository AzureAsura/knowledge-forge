package model

import "time"

type UserBadge struct {
	ID         uint   `gorm:"primaryKey"`
	UserID     uint   `gorm:"not null;index;uniqueIndex:idx_user_badge_user_slug"`
	BadgeSlug  string `gorm:"not null;uniqueIndex:idx_user_badge_user_slug"`
	UnlockedAt time.Time
	GrantedBy  *uint
}
