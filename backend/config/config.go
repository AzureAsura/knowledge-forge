package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port             string
	AppEnv           string
	RateLimitEnabled bool
}

func Load() Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Unset or unparsable means "on": the limiter is only ever disabled on purpose.
	rateLimitEnabled, err := strconv.ParseBool(os.Getenv("RATE_LIMIT_ENABLED"))
	if err != nil {
		rateLimitEnabled = true
	}

	return Config{Port: port, AppEnv: os.Getenv("APP_ENV"), RateLimitEnabled: rateLimitEnabled}
}
