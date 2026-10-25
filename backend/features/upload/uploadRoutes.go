package upload

import (
	"time"

	"backend/shared/middleware"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine) {
	r.POST("/uploads", middleware.AuthRequired(), middleware.RateLimit("upload", 20, time.Hour), UploadImage)
}
