package main

import (
	"log"
	"os"

	"backend/config"
	"backend/shared/model"
	"backend/shared/utils"
)

func main() {
	config.ConnectDB()

	email := os.Getenv("ADMIN_EMAIL")
	username := os.Getenv("ADMIN_USERNAME")
	password := os.Getenv("ADMIN_PASSWORD")
	fullName := os.Getenv("ADMIN_NAME")

	if email == "" || username == "" || password == "" || fullName == "" {
		log.Fatal("ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_NAME must be set in .env")
	}

	var existing model.User
	if err := config.DB.Where("email = ?", email).First(&existing).Error; err == nil {
		log.Println("Admin already exists, skipping")
		return
	}

	hashed, err := utils.HashPassword(password)
	if err != nil {
		log.Fatal("Failed to hash password", err)
	}

	admin := model.User{
		FullName:     fullName,
		Username:     username,
		Email:        email,
		PasswordHash: hashed,
		Role:         model.RoleAdmin,
		IsActive:     true,
	}
	if err := config.DB.Create(&admin).Error; err != nil {
		log.Fatal("Failed to create admin", err)
	}

	log.Println("Admin created:", admin.Email)
}
