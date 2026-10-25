package model

import "time"

// ProfileVisit is one visitor on one profile on one (Asia/Jakarta) day; the composite key keeps visitors unique per day.
type ProfileVisit struct {
	ProfileUserID uint      `gorm:"primaryKey;autoIncrement:false"`
	VisitorID     uint      `gorm:"primaryKey;autoIncrement:false"`
	VisitDate     time.Time `gorm:"primaryKey;autoIncrement:false;type:date"`
	CreatedAt     time.Time
}
