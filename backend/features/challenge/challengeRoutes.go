package challenge

import (
	"backend/shared/middleware"
	"backend/shared/model"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine) {
	g := r.Group("/challenges", middleware.AuthRequired())
	g.GET("", ListChallenges)
	g.GET("/:id", GetChallenge)
	g.POST("/:id/submit", Submit)
	g.GET("/submissions", middleware.RequireRole(model.RoleAdmin), ListSubmissions)
	g.PATCH("/submissions/:id", middleware.RequireRole(model.RoleAdmin), ReviewSubmission)

	admin := r.Group("/challenges", middleware.AuthRequired(), middleware.RequireRole(model.RoleAdmin))
	admin.POST("", CreateChallenge)
	admin.PATCH("/:id", UpdateChallenge)
}
