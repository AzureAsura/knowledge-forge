package model

import "time"

type Comment struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	ScrollID  uint      `gorm:"not null;index" json:"scroll_id"`
	AuthorID  uint      `gorm:"not null;index" json:"author_id"`
	Content   string    `gorm:"type:text;not null" json:"content"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
