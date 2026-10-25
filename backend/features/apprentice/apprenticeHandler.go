package apprentice

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

func Follow(c *gin.Context) {
	var input FollowInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Bad Request", "error": err.Error()})
		return
	}

	err := follow(c.GetUint("userId"), input.MentorID)
	if err != nil {
		switch {
		case errors.Is(err, ErrAlreadyHasMentor):
			c.JSON(http.StatusConflict, gin.H{"message": err.Error()})
		case errors.Is(err, ErrMentorNotFound):
			c.JSON(http.StatusNotFound, gin.H{"message": err.Error()})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Now following mentor"})
}

func Unfollow(c *gin.Context) {
	if err := unfollow(c.GetUint("userId")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Something went wrong"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Unfollowed mentor"})
}

func GetMentor(c *gin.Context) {
	mentor, err := getMentor(c.GetUint("userId"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Something went wrong"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Mentor found", "data": mentor})
}

func GetApprentices(c *gin.Context) {
	apprentices, err := getApprentices(c.GetUint("userId"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Something went wrong"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Apprentices found", "data": apprentices})
}
