package auth

import (
	"time"

	"backend/shared/middleware"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine) {
	g := r.Group("/auth")
	g.POST("/login", middleware.RateLimit("login", 5, 15*time.Minute), Login)
	g.POST("/refresh", Refresh)
	g.POST("/logout", Logout)
	g.GET("/me", middleware.AuthRequired(), Me)
	g.PATCH("/password", middleware.AuthRequired(), ChangePassword)
	g.POST("/avatar", middleware.AuthRequired(), UploadAvatar)
}
