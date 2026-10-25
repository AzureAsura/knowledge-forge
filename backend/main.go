package main

import (
	"log"
	"time"

	"backend/config"
	"backend/routes"
	"backend/shared/middleware"

	"github.com/gin-gonic/gin"
)

func main() {
	config.ConnectDB() // loads .env, so it must run before config.Load() reads the environment
	cfg := config.Load()
	config.ConnectCloudinary()

	r := gin.Default()
	// shortcut: trust nobody (no reverse proxy in front today, so ClientIP() = real TCP peer,
	// can't be spoofed via X-Forwarded-For). Revisit when deploying behind Vercel/any proxy — see note.md #8.
	r.SetTrustedProxies(nil)
	middleware.SetRateLimitEnabled(cfg.RateLimitEnabled)
	log.Printf("rate limiter: enabled=%v", cfg.RateLimitEnabled)
	r.Use(middleware.RateLimit("general", 100, time.Minute))
	routes.Setup(r, cfg)
	r.Run(":" + cfg.Port)
}
