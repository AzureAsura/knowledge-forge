package view

import (
	"backend/config"
	"backend/shared/model"
)

type Author struct {
	ID        uint   `json:"id"`
	FullName  string `json:"full_name"`
	Username  string `json:"username"`
	AvatarURL string `json:"avatar_url"`
	Role      string `json:"role"`
	Level     int    `json:"level"`
	Title     string `json:"title"`
}

type Category struct {
	ID       uint   `json:"id"`
	Name     string `json:"name"`
	Slug     string `json:"slug"`
	ParentID *uint  `json:"parent_id"`
}

type ScrollItem struct {
	model.Scroll
	Author   *Author   `json:"author"`
	Category *Category `json:"category"`
}

type CommentItem struct {
	model.Comment
	Author *Author `json:"author"`
}

func loadAuthors(ids []uint) (map[uint]*Author, error) {
	out := map[uint]*Author{}
	if len(ids) == 0 {
		return out, nil
	}
	var users []model.User
	if err := config.DB.Where("id IN ?", ids).Find(&users).Error; err != nil {
		return nil, err
	}
	for _, u := range users {
		out[u.ID] = &Author{ID: u.ID, FullName: u.FullName, Username: u.Username, AvatarURL: u.AvatarURL, Role: u.Role, Level: u.CurrentLevel, Title: u.Title}
	}
	return out, nil
}

func loadCategories(ids []uint) (map[uint]*Category, error) {
	out := map[uint]*Category{}
	if len(ids) == 0 {
		return out, nil
	}
	var cats []model.Category
	if err := config.DB.Where("id IN ?", ids).Find(&cats).Error; err != nil {
		return nil, err
	}
	for _, c := range cats {
		out[c.ID] = &Category{ID: c.ID, Name: c.Name, Slug: c.Slug, ParentID: c.ParentID}
	}
	return out, nil
}

// Scrolls attaches author and category to each scroll using two batched queries (no N+1).
func Scrolls(scrolls []model.Scroll) ([]ScrollItem, error) {
	authorIDs := make([]uint, 0, len(scrolls))
	categoryIDs := make([]uint, 0, len(scrolls))
	for _, s := range scrolls {
		authorIDs = append(authorIDs, s.AuthorID)
		categoryIDs = append(categoryIDs, s.CategoryID)
	}

	authors, err := loadAuthors(authorIDs)
	if err != nil {
		return nil, err
	}
	categories, err := loadCategories(categoryIDs)
	if err != nil {
		return nil, err
	}

	items := make([]ScrollItem, 0, len(scrolls))
	for _, s := range scrolls {
		items = append(items, ScrollItem{Scroll: s, Author: authors[s.AuthorID], Category: categories[s.CategoryID]})
	}
	return items, nil
}

func Comments(comments []model.Comment) ([]CommentItem, error) {
	ids := make([]uint, 0, len(comments))
	for _, c := range comments {
		ids = append(ids, c.AuthorID)
	}

	authors, err := loadAuthors(ids)
	if err != nil {
		return nil, err
	}

	items := make([]CommentItem, 0, len(comments))
	for _, c := range comments {
		items = append(items, CommentItem{Comment: c, Author: authors[c.AuthorID]})
	}
	return items, nil
}
