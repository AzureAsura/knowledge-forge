package user

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

func CreateUser(c *gin.Context) {
	var input CreateUserInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Bad Request", "error": err.Error()})
		return
	}

	user, err := createUser(input)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"message": err.Error()})
		return
	}
	user.PasswordHash = ""

	c.JSON(http.StatusCreated, gin.H{"message": "User created", "data": user})
}

func GetPublicUser(c *gin.Context) {
	username := c.Param("username")
	callerRole := c.GetString("role")

	profile, err := getPublicUser(username, callerRole, c.GetUint("userId"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Profile found", "data": profile})
}

func GetUserBadges(c *gin.Context) {
	username := c.Param("username")
	callerRole := c.GetString("role")

	badges, err := getUserBadges(username, callerRole)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Badges found", "data": badges})
}

func UpdateMe(c *gin.Context) {
	var input UpdateMeInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Bad Request", "error": err.Error()})
		return
	}

	user, err := updateMe(c.GetUint("userId"), input)
	if err != nil {
		if errors.Is(err, ErrUsernameTaken) {
			c.JSON(http.StatusConflict, gin.H{"message": err.Error()})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Profile updated", "data": user})
}

func GetDashboard(c *gin.Context) {
	dashboard, err := getDashboard(c.GetUint("userId"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Dashboard found", "data": dashboard})
}
