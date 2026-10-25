package model

type Category struct {
	ID          uint   `gorm:"primaryKey" json:"id"`
	Name        string `gorm:"not null" json:"name"`
	Slug        string `gorm:"uniqueIndex;not null" json:"slug"`
	Description string `json:"description"`
	ParentID    *uint  `gorm:"index" json:"parent_id"`
	IsActive    bool   `gorm:"not null;default:true" json:"is_active"`
}
