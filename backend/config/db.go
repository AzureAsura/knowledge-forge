package config

import (
	"log"
	"os"

	"backend/shared/model"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDB() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("ENV is missing")
	}

	database, err := gorm.Open(postgres.New(postgres.Config{
		DSN:                  dsn,
		PreferSimpleProtocol: true,
	}), &gorm.Config{})

	if err != nil {
		log.Fatal("Error connecting to DB", err)
	}

	if err := database.AutoMigrate(&model.User{}, &model.RefreshToken{}, &model.Category{}, &model.Scroll{}, &model.Like{}, &model.Bookmark{}, &model.Comment{}, &model.ScrollRead{}, &model.RateLimit{}, &model.XPLog{}, &model.DailyXPCounter{}, &model.TopicMastery{}, &model.UserBadge{}, &model.UserStreak{}, &model.Challenge{}, &model.ChallengeSubmission{}, &model.ProfileVisit{}); err != nil {
		log.Fatal("Error migrating the DB", err)
	}

	DB = database
	log.Print("Connected to DB")
}
