package apprentice

import (
	"backend/shared/middleware"
	"backend/shared/model"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine) {
	g := r.Group("/apprentice", middleware.AuthRequired())
	g.POST("/follow", middleware.RequireRole(model.RoleScholar), Follow)
	g.DELETE("/follow", middleware.RequireRole(model.RoleScholar), Unfollow)
	g.GET("/mentor", middleware.RequireRole(model.RoleScholar), GetMentor)
	g.GET("/apprentices", middleware.RequireRole(model.RoleSenior, model.RoleAdmin), GetApprentices)
}
