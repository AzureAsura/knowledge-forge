package model

import "time"

type Bookmark struct {
	ID        uint `gorm:"primaryKey"`
	ScrollID  uint `gorm:"not null;index;uniqueIndex:idx_bookmark_scroll_user"`
	UserID    uint `gorm:"not null;index;uniqueIndex:idx_bookmark_scroll_user"`
	CreatedAt time.Time
}
