package model

import "time"

const (
	RoleScholar = "scholar"
	RoleSenior  = "senior"
	RoleAdmin   = "admin"
)

type User struct {
	ID             uint       `gorm:"primaryKey" json:"id"`
	FullName       string     `gorm:"not null" json:"full_name"`
	Username       string     `gorm:"uniqueIndex;not null" json:"username"`
	Email          string     `gorm:"uniqueIndex;not null" json:"email"`
	PasswordHash   string     `gorm:"not null" json:"-"`
	Role           string     `gorm:"not null;default:scholar" json:"role"`
	Bio            string     `json:"bio"`
	AvatarURL      string     `json:"avatar_url"`
	AvatarPublicID string     `json:"-"`
	IsActive       bool       `gorm:"not null;default:true" json:"is_active"`
	MentorID       *uint      `gorm:"index" json:"mentor_id"`
	MentorSince    *time.Time `json:"-"`
	TotalXP        int        `gorm:"not null;default:0" json:"total_xp"`
	CurrentLevel   int        `gorm:"not null;default:1" json:"current_level"`
	Title          string     `gorm:"not null;default:'Novice Scholar'" json:"title"`
	XPForNextLevel int        `gorm:"-" json:"xp_for_next_level"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}
