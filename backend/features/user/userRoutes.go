package user

import (
	"backend/shared/middleware"
	"backend/shared/model"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine) {
	g := r.Group("/users", middleware.AuthRequired(), middleware.RequireRole(model.RoleAdmin))
	g.POST("", CreateUser)

	r.GET("/users/:username", middleware.AuthRequired(), GetPublicUser)
	r.GET("/users/:username/badges", middleware.AuthRequired(), GetUserBadges)
	r.PATCH("/users/me", middleware.AuthRequired(), UpdateMe)
	r.GET("/dashboard", middleware.AuthRequired(), GetDashboard)
}
