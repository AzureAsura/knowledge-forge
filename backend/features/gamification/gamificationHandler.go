package gamification

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func GetTree(c *gin.Context) {
	userID, err := strconv.ParseUint(c.Param("userId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid user id"})
		return
	}

	tree, err := getTree(uint(userID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tree found", "data": tree})
}

func GetXPHistory(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	logs, pagination, err := getXPHistory(c.GetUint("userId"), page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Something went wrong"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "XP history found", "data": logs, "pagination": pagination})
}

func GetXPStats(c *gin.Context) {
	stats, err := getXPStats(c.GetUint("userId"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "XP stats found", "data": stats})
}

func GetLeaderboard(c *gin.Context) {
	leaderboardType := c.Query("type")
	if leaderboardType != "xp" && leaderboardType != "scribes" && leaderboardType != "mentors" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid type"})
		return
	}

	period := c.DefaultQuery("period", "all")
	if period != "7d" && period != "30d" && period != "all" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid period"})
		return
	}

	items, err := getLeaderboard(leaderboardType, period)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Something went wrong"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Leaderboard found", "data": items})
}

func GetBadges(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "Badges found", "data": listBadges()})
}

func GetMyBadges(c *gin.Context) {
	items, err := myBadges(c.GetUint("userId"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Something went wrong"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Badges found", "data": items})
}

func GrantBadge(c *gin.Context) {
	slug := c.Param("slug")

	var input GrantBadgeInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Bad Request", "error": err.Error()})
		return
	}

	result, err := grantBadge(c.GetUint("userId"), slug, input.UserID)
	if err != nil {
		switch {
		case errors.Is(err, ErrBadgeUserNotFound):
			c.JSON(http.StatusNotFound, gin.H{"message": err.Error()})
		case errors.Is(err, ErrBadgeAlreadyUnlocked):
			c.JSON(http.StatusConflict, gin.H{"message": err.Error()})
		case errors.Is(err, ErrBadgeNotFound), errors.Is(err, ErrBadgeNotManual):
			c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Badge granted", "data": result})
}
