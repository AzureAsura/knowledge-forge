package dev

import (
	"net"
	"net/http"

	"backend/config"
	"backend/shared/middleware"

	"github.com/gin-gonic/gin"
)

// loopbackOnly rejects anything that is not the local machine. ClientIP() is the real TCP peer
// because main.go trusts no proxies, so X-Forwarded-For cannot spoof it.
func loopbackOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		if ip := net.ParseIP(c.ClientIP()); ip == nil || !ip.IsLoopback() {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"message": "Forbidden"})
			return
		}
		c.Next()
	}
}

func GetRateLimit(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"data": gin.H{"enabled": middleware.RateLimitEnabled()}})
}

func SetRateLimit(c *gin.Context) {
	var input struct {
		Enabled *bool `json:"enabled" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Bad Request", "error": err.Error()})
		return
	}

	middleware.SetRateLimitEnabled(*input.Enabled)
	c.JSON(http.StatusOK, gin.H{"data": gin.H{"enabled": middleware.RateLimitEnabled()}})
}

// ResetRateLimitCounters clears every counter: unblocks a locked-out IP, or restarts a limiter test from zero.
func ResetRateLimitCounters(c *gin.Context) {
	result := config.DB.Exec("DELETE FROM rate_limits")
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Something went wrong"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": gin.H{"cleared": result.RowsAffected}})
}
