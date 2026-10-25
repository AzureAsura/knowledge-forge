package model

import "time"

const (
	ScrollStatusDraft     = "draft"
	ScrollStatusPending   = "pending"
	ScrollStatusPublished = "published"
	ScrollStatusArchived  = "archived"
)

const (
	DifficultyBeginner     = "beginner"
	DifficultyIntermediate = "intermediate"
	DifficultyAdvanced     = "advanced"
)

type Scroll struct {
	ID                 uint       `gorm:"primaryKey" json:"id"`
	AuthorID           uint       `gorm:"not null;index" json:"author_id"`
	CategoryID         uint       `gorm:"not null;index" json:"category_id"`
	Title              string     `gorm:"not null" json:"title"`
	Slug               string     `gorm:"uniqueIndex;not null" json:"slug"`
	Excerpt            string     `json:"excerpt"`
	Content            string     `gorm:"type:text;not null" json:"content"`
	CoverImageURL      string     `json:"cover_image_url"`
	CoverImagePublicID string     `json:"-"`
	Status             string     `gorm:"not null;default:draft;index" json:"status"`
	Difficulty         string     `gorm:"not null;default:beginner" json:"difficulty"`
	ViewCount          int        `gorm:"not null;default:0" json:"view_count"`
	LikesCount         int        `gorm:"not null;default:0" json:"likes_count"`
	BookmarksCount     int        `gorm:"not null;default:0" json:"bookmarks_count"`
	CommentsCount      int        `gorm:"not null;default:0" json:"comments_count"`
	IsFeatured         bool       `gorm:"not null;default:false;index" json:"is_featured"`
	PublishedAt        *time.Time `json:"published_at"`
	ReviewedByID       *uint      `json:"-"`
	ReviewedAt         *time.Time `json:"-"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}
