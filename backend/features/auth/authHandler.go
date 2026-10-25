package auth

import (
	"net/http"

	"backend/shared/utils"

	"github.com/gin-gonic/gin"
)

func Login(c *gin.Context) {
	var input LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Bad Request"})
		return
	}

	access, refresh, err := login(input)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Login success",
		"data":    gin.H{"access_token": access, "refresh_token": refresh},
	})
}

func Refresh(c *gin.Context) {
	var input RefreshInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Bad Request"})
		return
	}

	access, newRefresh, err := refresh(input.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Token refreshed",
		"data":    gin.H{"access_token": access, "refresh_token": newRefresh},
	})
}

func Logout(c *gin.Context) {
	var input RefreshInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Bad Request"})
		return
	}

	if err := logout(input.RefreshToken); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Something went wrong"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Logout success"})
}

func Me(c *gin.Context) {
	userId := c.GetUint("userId")

	user, err := getMe(userId)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "User not found"})
		return
	}
	user.PasswordHash = ""

	c.JSON(http.StatusOK, gin.H{"message": "User data found", "data": user})
}

func ChangePassword(c *gin.Context) {
	var input ChangePasswordInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Bad Request", "error": err.Error()})
		return
	}

	if err := changePassword(c.GetUint("userId"), input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password changed"})
}

func UploadAvatar(c *gin.Context) {
	file, err := c.FormFile("avatar")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Avatar file is required"})
		return
	}
	if file.Size > utils.MaxImageSize {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Image size exceeds 4MB limit"})
		return
	}

	user, err := updateAvatar(c.GetUint("userId"), file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	user.PasswordHash = ""

	c.JSON(http.StatusOK, gin.H{"message": "Avatar updated", "data": user})
}
