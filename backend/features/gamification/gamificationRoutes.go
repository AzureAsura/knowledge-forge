package gamification

import (
	"backend/shared/middleware"
	"backend/shared/model"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine) {
	r.GET("/tree/:userId", middleware.AuthRequired(), GetTree)
	r.GET("/xp/history", middleware.AuthRequired(), GetXPHistory)
	r.GET("/xp/stats", middleware.AuthRequired(), GetXPStats)
	r.GET("/leaderboard", middleware.AuthRequired(), GetLeaderboard)
	r.GET("/badges", middleware.AuthRequired(), GetBadges)
	r.GET("/badges/my", middleware.AuthRequired(), GetMyBadges)
	r.POST("/badges/:slug/grant", middleware.AuthRequired(), middleware.RequireRole(model.RoleAdmin), GrantBadge)
}
