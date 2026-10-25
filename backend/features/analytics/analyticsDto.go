package analytics

// Kpi is a total over the selected range next to the same-length range right before it.
type Kpi struct {
	Total    int64 `json:"total"`
	Previous int64 `json:"previous"`
}

type Named struct {
	Name  string `json:"name"`
	Value int64  `json:"value"`
}

type DatePoint struct {
	Date  string `json:"date"`
	Value int64  `json:"value"`
}

type MePoint struct {
	Date      string `json:"date"`
	Views     int64  `json:"views"`
	Likes     int64  `json:"likes"`
	Bookmarks int64  `json:"bookmarks"`
	Comments  int64  `json:"comments"`
	Visitors  int64  `json:"visitors"`
	XP        int64  `json:"xp"`
	Reads     int64  `json:"reads"`
}

type MeKpis struct {
	Views     Kpi `json:"views"`
	Likes     Kpi `json:"likes"`
	Bookmarks Kpi `json:"bookmarks"`
	Comments  Kpi `json:"comments"`
	Visitors  Kpi `json:"visitors"`
	XP        Kpi `json:"xp"`
	Reads     Kpi `json:"reads"`
}

type MeResponse struct {
	Range            string    `json:"range"`
	Granularity      string    `json:"granularity"`
	Kpis             MeKpis    `json:"kpis"`
	Series           []MePoint `json:"series"`
	XPBySource       []Named   `json:"xp_by_source"`
	PublishedScrolls int64     `json:"published_scrolls"`
	CurrentStreak    int       `json:"current_streak"`
}

type RosterRow struct {
	ID               uint   `json:"id"`
	FullName         string `json:"full_name"`
	Username         string `json:"username"`
	Level            int    `json:"level"`
	PublishedScrolls int64  `json:"published_scrolls"`
	XPInRange        int64  `json:"xp_in_range"`
}

type ReviewQueue struct {
	Pending     int64   `json:"pending"`
	OldestHours float64 `json:"oldest_hours"`
	AvgHours    float64 `json:"avg_hours"`
}

type MentorResponse struct {
	Range           string      `json:"range"`
	Granularity     string      `json:"granularity"`
	ApprenticeCount int64       `json:"apprentice_count"`
	NewApprentices  Kpi         `json:"new_apprentices"`
	Growth          []DatePoint `json:"growth"`
	Roster          []RosterRow `json:"roster"`
	Review          ReviewQueue `json:"review"`
	Approved        Kpi         `json:"approved"`
	ApprovedSeries  []DatePoint `json:"approved_series"`
}

type PlatformPoint struct {
	Date        string `json:"date"`
	ActiveUsers int64  `json:"active_users"`
	Views       int64  `json:"views"`
	Likes       int64  `json:"likes"`
	Bookmarks   int64  `json:"bookmarks"`
	Comments    int64  `json:"comments"`
	Published   int64  `json:"published"`
	NewUsers    int64  `json:"new_users"`
	XP          int64  `json:"xp"`
}

type PlatformKpis struct {
	ActiveUsers Kpi `json:"active_users"`
	NewUsers    Kpi `json:"new_users"`
	Published   Kpi `json:"published"`
	Views       Kpi `json:"views"`
	Likes       Kpi `json:"likes"`
	Comments    Kpi `json:"comments"`
	XP          Kpi `json:"xp"`
}

type TopAuthor struct {
	ID        uint   `json:"id"`
	FullName  string `json:"full_name"`
	Username  string `json:"username"`
	Published int64  `json:"published"`
	Likes     int64  `json:"likes"`
}

type ChallengeStats struct {
	Active      int64   `json:"active"`
	Submissions []Named `json:"submissions"`
}

type PlatformResponse struct {
	Range           string          `json:"range"`
	Granularity     string          `json:"granularity"`
	TotalUsers      int64           `json:"total_users"`
	PendingScrolls  int64           `json:"pending_scrolls"`
	Kpis            PlatformKpis    `json:"kpis"`
	Series          []PlatformPoint `json:"series"`
	UsersByRole     []Named         `json:"users_by_role"`
	ScrollsByStatus []Named         `json:"scrolls_by_status"`
	ByCategory      []Named         `json:"by_category"`
	TopAuthors      []TopAuthor     `json:"top_authors"`
	Challenges      ChallengeStats  `json:"challenges"`
}
