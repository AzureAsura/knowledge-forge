package engagement

import (
	"time"

	"backend/shared/middleware"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine) {
	mutate := r.Group("/scrolls/:id", middleware.AuthRequired())
	engagementLimit := middleware.RateLimit("engagement", 30, time.Minute)
	mutate.POST("/like", engagementLimit, LikeScroll)
	mutate.DELETE("/like", engagementLimit, UnlikeScroll)
	mutate.POST("/bookmark", engagementLimit, BookmarkScroll)
	mutate.DELETE("/bookmark", engagementLimit, UnbookmarkScroll)
	mutate.POST("/comments", middleware.RateLimit("comment", 20, time.Minute), CreateComment)

	r.GET("/scrolls/:idOrSlug/comments", middleware.AuthRequired(), ListComments)

	r.DELETE("/comments/:commentId", middleware.AuthRequired(), DeleteComment)
}
