package model

import "time"

type Like struct {
	ID        uint `gorm:"primaryKey"`
	ScrollID  uint `gorm:"not null;index;uniqueIndex:idx_like_scroll_user"`
	UserID    uint `gorm:"not null;index;uniqueIndex:idx_like_scroll_user"`
	CreatedAt time.Time
}
