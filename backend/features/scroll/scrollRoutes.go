package scroll

import (
	"time"

	"backend/shared/middleware"
	"backend/shared/model"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine) {
	g := r.Group("/scrolls", middleware.AuthRequired())
	g.POST("", middleware.RateLimit("create_scroll", 10, time.Hour), CreateScroll)
	g.GET("", ListScrolls)
	g.GET("/:idOrSlug", GetScroll)
	g.PATCH("/:id", UpdateScroll)
	g.DELETE("/:id", DeleteScroll)
	g.POST("/:id/submit", SubmitScroll)
	g.POST("/:id/approve", ApproveScroll)
	g.POST("/:id/reject", RejectScroll)
	g.POST("/:id/archive", ArchiveScroll)
	g.POST("/:id/feature", middleware.RequireRole(model.RoleAdmin), FeatureScroll)
	g.POST("/:id/unfeature", middleware.RequireRole(model.RoleAdmin), UnfeatureScroll)
}
