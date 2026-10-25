package middleware

import (
	"fmt"
	"math/rand"
	"net/http"
	"strconv"
	"sync/atomic"
	"time"

	"backend/config"

	"github.com/gin-gonic/gin"
)

var rateLimitEnabled atomic.Bool

func init() { rateLimitEnabled.Store(true) }

// SetRateLimitEnabled is the single switch for every RateLimit middleware. When off, requests skip
// the limiter entirely (nothing is counted), so it can be flipped at runtime during development.
func SetRateLimitEnabled(enabled bool) { rateLimitEnabled.Store(enabled) }

func RateLimitEnabled() bool { return rateLimitEnabled.Load() }

// RateLimit caps how many requests a given action+identity can make per fixed window,
// using a Postgres counter table (no Redis available). Identity is userId when
// AuthRequired() already ran before this middleware, otherwise the client IP.
func RateLimit(action string, max int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !rateLimitEnabled.Load() {
			c.Next()
			return
		}

		identity := c.ClientIP()
		if userId, ok := c.Get("userId"); ok {
			identity = fmt.Sprint(userId)
		}
		key := action + ":" + identity
		windowStart := time.Now().Truncate(window)

		var count int
		err := config.DB.Raw(`
			INSERT INTO rate_limits (key, window_start, count)
			VALUES (?, ?, 1)
			ON CONFLICT (key, window_start) DO UPDATE SET count = rate_limits.count + 1
			RETURNING count
		`, key, windowStart).Scan(&count).Error
		// shortcut: fail-open on DB error (allows requests during an outage instead of
		// blocking everyone); upgrade to fail-closed if brute-force-during-outage becomes a real risk
		if err == nil && count > max {
			retryAfter := time.Until(windowStart.Add(window))
			c.Header("Retry-After", strconv.Itoa(int(retryAfter.Seconds())))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"message": "Too many requests, please try again later"})
			return
		}

		if rand.Intn(100) == 0 {
			config.DB.Exec("DELETE FROM rate_limits WHERE window_start < ?", time.Now().Add(-24*time.Hour))
		}

		c.Next()
	}
}
