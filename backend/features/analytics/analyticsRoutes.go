package analytics

import (
	"backend/shared/middleware"
	"backend/shared/model"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine) {
	g := r.Group("/analytics", middleware.AuthRequired())
	g.GET("/me", GetMe)
	g.GET("/mentor", middleware.RequireRole(model.RoleSenior, model.RoleAdmin), GetMentor)
	g.GET("/platform", middleware.RequireRole(model.RoleAdmin), GetPlatform)
}
