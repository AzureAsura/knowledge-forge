package model

import "time"

type XPLog struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	UserID     uint      `gorm:"not null;index;uniqueIndex:idx_xplog_user_reason_source" json:"user_id"`
	Amount     int       `gorm:"not null" json:"amount"`
	Reason     string    `gorm:"not null;uniqueIndex:idx_xplog_user_reason_source" json:"reason"`
	SourceType string    `gorm:"not null" json:"source_type"`
	SourceID   uint      `gorm:"not null;uniqueIndex:idx_xplog_user_reason_source" json:"source_id"`
	CreatedAt  time.Time `json:"created_at"`
}
