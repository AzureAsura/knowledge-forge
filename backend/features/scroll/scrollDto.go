package scroll

import (
	"mime/multipart"

	"backend/shared/gamification"
	"backend/shared/view"
)

type CreateScrollInput struct {
	Title      string                `json:"title" form:"title" binding:"required"`
	CategoryID uint                  `json:"category_id" form:"category_id" binding:"required"`
	Content    string                `json:"content" form:"content" binding:"required"`
	Excerpt    string                `json:"excerpt" form:"excerpt"`
	Difficulty string                `json:"difficulty" form:"difficulty" binding:"omitempty,oneof=beginner intermediate advanced"`
	CoverImage *multipart.FileHeader `form:"cover_image"`
}

type UpdateScrollInput struct {
	Title            *string               `json:"title" form:"title"`
	CategoryID       *uint                 `json:"category_id" form:"category_id"`
	Content          *string               `json:"content" form:"content"`
	Excerpt          *string               `json:"excerpt" form:"excerpt"`
	Difficulty       *string               `json:"difficulty" form:"difficulty" binding:"omitempty,oneof=beginner intermediate advanced"`
	RemoveCoverImage bool                  `json:"remove_cover_image" form:"remove_cover_image"`
	CoverImage       *multipart.FileHeader `form:"cover_image"`
}

type ScrollListQuery struct {
	Status     string `form:"status"`
	Mine       bool   `form:"mine"`
	CategoryID uint   `form:"category_id"`
	Author     string `form:"author"`
	Difficulty string `form:"difficulty" binding:"omitempty,oneof=beginner intermediate advanced"`
	Bookmarked bool   `form:"bookmarked"`
	Liked      bool   `form:"liked"`
	Search     string `form:"search"`
	Sort       string `form:"sort,default=-created_at"`
	Page       int    `form:"page,default=1"`
	Limit      int    `form:"limit,default=20"`
}

type ScrollDetail struct {
	view.ScrollItem
	IsLiked      bool `json:"is_liked"`
	IsBookmarked bool `json:"is_bookmarked"`
}

type PublishSummary struct {
	XPGained     int                         `json:"xp_gained"`
	LevelUp      bool                        `json:"level_up"`
	NewLevel     int                         `json:"new_level"`
	NewBadges    []gamification.UnlockResult `json:"new_badges"`
	TopicLevelUp *gamification.TopicResult   `json:"topic_level_up,omitempty"`
}
