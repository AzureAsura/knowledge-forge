package routes

import (
	"log"

	"backend/config"
	"backend/features/analytics"
	"backend/features/apprentice"
	"backend/features/auth"
	"backend/features/category"
	"backend/features/challenge"
	"backend/features/dev"
	"backend/features/engagement"
	"backend/features/gamification"
	"backend/features/scroll"
	"backend/features/upload"
	"backend/features/user"

	"github.com/gin-gonic/gin"
)

func Setup(r *gin.Engine, cfg config.Config) {
	auth.RegisterRoutes(r)
	user.RegisterRoutes(r)
	category.RegisterRoutes(r)
	scroll.RegisterRoutes(r)
	engagement.RegisterRoutes(r)
	upload.RegisterRoutes(r)
	gamification.RegisterRoutes(r)
	apprentice.RegisterRoutes(r)
	challenge.RegisterRoutes(r)
	analytics.RegisterRoutes(r)

	if cfg.AppEnv == "development" {
		log.Println("[dev] APP_ENV=development: /dev/* routes are enabled (loopback only). Never set this in production.")
		dev.RegisterRoutes(r)
	}
}
