package dev

import "github.com/gin-gonic/gin"

// RegisterRoutes exposes development-only controls. It must only be called when APP_ENV=development.
func RegisterRoutes(r *gin.Engine) {
	g := r.Group("/dev", loopbackOnly())
	g.GET("/rate-limit", GetRateLimit)
	g.PUT("/rate-limit", SetRateLimit)
	g.DELETE("/rate-limit/counters", ResetRateLimitCounters)
}
