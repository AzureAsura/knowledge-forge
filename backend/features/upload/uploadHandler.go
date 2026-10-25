package upload

import (
	"net/http"

	"backend/shared/utils"

	"github.com/gin-gonic/gin"
)

func UploadImage(c *gin.Context) {
	file, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Image file is required"})
		return
	}

	if file.Size > utils.MaxImageSize {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Image size exceeds 4MB limit"})
		return
	}

	folder := c.DefaultPostForm("folder", "misc")

	url, publicID, err := utils.UploadImage(file, folder)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to upload image", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Image uploaded", "data": gin.H{"url": url, "public_id": publicID}})
}
