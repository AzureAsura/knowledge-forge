package category

import (
	"backend/config"
	"backend/shared/model"
)

func listCategories() ([]model.Category, error) {
	var categories []model.Category
	err := config.DB.Where("is_active = ?", true).Order("id").Find(&categories).Error
	return categories, err
}
