package category

import (
	"backend/shared/middleware"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine) {
	r.GET("/categories", middleware.AuthRequired(), ListCategories)
}
