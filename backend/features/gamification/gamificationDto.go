package gamification

import "time"

type BadgeDefinitionResponse struct {
	Slug        string `json:"slug"`
	Name        string `json:"name"`
	Icon        string `json:"icon"`
	Color       string `json:"color"`
	XPReward    int    `json:"xp_reward"`
	TriggerType string `json:"trigger_type"`
}

type MyBadgeResponse struct {
	Slug        string     `json:"slug"`
	Name        string     `json:"name"`
	Icon        string     `json:"icon"`
	Color       string     `json:"color"`
	XPReward    int        `json:"xp_reward"`
	Unlocked    bool       `json:"unlocked"`
	UnlockedAt  *time.Time `json:"unlocked_at"`
	PercentDone *int       `json:"percent_done"`
}

type GrantBadgeInput struct {
	UserID uint `json:"user_id" binding:"required"`
}

// NextLevel is what a topic needs for its next level: all three requirements must be met.
type NextLevel struct {
	Level       int `json:"level"`
	XP          int `json:"xp"`
	Contributed int `json:"contributed"`
	Read        int `json:"read"`
	BonusXP     int `json:"bonus_xp"`
}

type TreeNode struct {
	ID                 uint       `json:"id"`
	Name               string     `json:"name"`
	Slug               string     `json:"slug"`
	Level              int        `json:"level"`
	XPInTopic          int        `json:"xp_in_topic"`
	XPForNextLevel     int        `json:"xp_for_next_level"`
	ScrollsContributed int        `json:"scrolls_contributed"`
	ScrollsRead        int        `json:"scrolls_read"`
	NextLevel          *NextLevel `json:"next_level"` // nil at the maximum level
	PublishedScrolls   int        `json:"published_scrolls"`
	ReadableScrolls    int        `json:"readable_scrolls"` // published scrolls by other people: the pool that "scrolls read" can grow into
}

type TreeCenter struct {
	Name       string `json:"name"`
	TotalLevel int    `json:"total_level"`
	TotalXP    int    `json:"total_xp"`
}

type TreeResponse struct {
	Nodes  []TreeNode `json:"nodes"`
	Center TreeCenter `json:"center"`
}

type XPStatsResponse struct {
	TotalXP            int     `json:"total_xp"`
	CurrentLevel       int     `json:"current_level"`
	Title              string  `json:"title"`
	XPForNextLevel     int     `json:"xp_for_next_level"`
	XPNeeded           int     `json:"xp_needed"`
	ProgressPercentage float64 `json:"progress_percentage"`
}

type LeaderboardUser struct {
	ID        uint   `json:"id"`
	FullName  string `json:"full_name"`
	Username  string `json:"username"`
	AvatarURL string `json:"avatar_url"`
	Level     int    `json:"level"`
}

type LeaderboardItem struct {
	Rank   int             `json:"rank"`
	User   LeaderboardUser `json:"user"`
	Metric int64           `json:"metric"`
	Trend  string          `json:"trend"`
}
