package analytics

import (
	"fmt"
	"time"

	"backend/config"
	"backend/shared/gamification"
)

// window is the selected range plus the same-length range before it: `buckets` holds the previous
// period first, then the current one. week/month bucket by day, year by month (Asia/Jakarta).
type window struct {
	rng     string
	step    string
	n       int
	tz      string
	buckets []time.Time
	end     time.Time
}

var rangeLen = map[string]int{"week": 7, "month": 30, "year": 12}

func newWindow(rng string) (window, bool) {
	n, ok := rangeLen[rng]
	if !ok {
		return window{}, false
	}
	loc := gamification.JakartaLocation()
	now := time.Now().In(loc)
	w := window{rng: rng, n: n, tz: loc.String()}

	if rng == "year" {
		w.step = "month"
		first := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, loc)
		for i := -(2*n - 1); i <= 0; i++ {
			w.buckets = append(w.buckets, first.AddDate(0, i, 0))
		}
		w.end = first.AddDate(0, 1, 0)
	} else {
		w.step = "day"
		today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, loc)
		for i := -(2*n - 1); i <= 0; i++ {
			w.buckets = append(w.buckets, today.AddDate(0, 0, i))
		}
		w.end = today.AddDate(0, 0, 1)
	}
	return w, true
}

func (w window) key(t time.Time) string { return t.Format("2006-01-02") }
func (w window) curStart() time.Time    { return w.buckets[w.n] }
func (w window) prevStart() time.Time   { return w.buckets[0] }
func (w window) cur() []time.Time       { return w.buckets[w.n:] }

type bucketRow struct {
	K string
	N int64
}

// series aggregates `agg` over `from`, grouped into this window's buckets, across previous + current period.
// agg, from and ts are internal constants (never user input); `where` takes ? placeholders.
func (w window) series(agg, from, ts, where string, args ...any) (map[string]int64, error) {
	q := fmt.Sprintf(
		`SELECT to_char(date_trunc(?, %[1]s AT TIME ZONE ?), 'YYYY-MM-DD') AS k, %[2]s AS n FROM %[3]s WHERE %[1]s >= ? AND %[1]s < ?`,
		ts, agg, from)
	if where != "" {
		q += " AND (" + where + ")"
	}
	q += " GROUP BY k"

	params := append([]any{w.step, w.tz, w.prevStart(), w.end}, args...)
	var rows []bucketRow
	if err := config.DB.Raw(q, params...).Scan(&rows).Error; err != nil {
		return nil, err
	}
	out := make(map[string]int64, len(rows))
	for _, r := range rows {
		out[r.K] = r.N
	}
	return out, nil
}

func (w window) kpi(m map[string]int64) Kpi {
	var k Kpi
	for i, b := range w.buckets {
		if i < w.n {
			k.Previous += m[w.key(b)]
		} else {
			k.Total += m[w.key(b)]
		}
	}
	return k
}

func (w window) points(m map[string]int64) []DatePoint {
	out := make([]DatePoint, 0, w.n)
	for _, b := range w.cur() {
		out = append(out, DatePoint{Date: w.key(b), Value: m[w.key(b)]})
	}
	return out
}

type metric struct {
	agg, from, ts, where string
	args                 []any
}

// run evaluates every metric over the window; the first error aborts.
func (w window) run(metrics map[string]metric) (map[string]map[string]int64, error) {
	out := make(map[string]map[string]int64, len(metrics))
	for name, m := range metrics {
		s, err := w.series(m.agg, m.from, m.ts, m.where, m.args...)
		if err != nil {
			return nil, err
		}
		out[name] = s
	}
	return out, nil
}

const (
	count  = "COUNT(*)"
	sumXP  = "COALESCE(SUM(amount), 0)"
	readOn = "scroll_reads sr JOIN scrolls s ON s.id = sr.scroll_id"
)

func getMe(uid uint, w window) (MeResponse, error) {
	data, err := w.run(map[string]metric{
		"views":     {count, readOn, "sr.first_read_at", "s.author_id = ? AND sr.user_id <> ?", []any{uid, uid}},
		"likes":     {count, "likes l JOIN scrolls s ON s.id = l.scroll_id", "l.created_at", "s.author_id = ? AND l.user_id <> ?", []any{uid, uid}},
		"bookmarks": {count, "bookmarks b JOIN scrolls s ON s.id = b.scroll_id", "b.created_at", "s.author_id = ? AND b.user_id <> ?", []any{uid, uid}},
		"comments":  {count, "comments c JOIN scrolls s ON s.id = c.scroll_id", "c.created_at", "s.author_id = ? AND c.author_id <> ?", []any{uid, uid}},
		"visitors":  {count, "profile_visits", "created_at", "profile_user_id = ?", []any{uid}},
		"xp":        {sumXP, "xp_logs", "created_at", "user_id = ?", []any{uid}},
		"reads":     {count, readOn, "sr.first_read_at", "sr.user_id = ? AND s.author_id <> ?", []any{uid, uid}},
	})
	if err != nil {
		return MeResponse{}, err
	}

	res := MeResponse{
		Range: w.rng, Granularity: w.step,
		Kpis: MeKpis{
			Views: w.kpi(data["views"]), Likes: w.kpi(data["likes"]), Bookmarks: w.kpi(data["bookmarks"]),
			Comments: w.kpi(data["comments"]), Visitors: w.kpi(data["visitors"]), XP: w.kpi(data["xp"]), Reads: w.kpi(data["reads"]),
		},
		Series: make([]MePoint, 0, w.n),
	}
	for _, b := range w.cur() {
		k := w.key(b)
		res.Series = append(res.Series, MePoint{
			Date: k, Views: data["views"][k], Likes: data["likes"][k], Bookmarks: data["bookmarks"][k],
			Comments: data["comments"][k], Visitors: data["visitors"][k], XP: data["xp"][k], Reads: data["reads"][k],
		})
	}

	res.XPBySource = []Named{}
	if err := config.DB.Raw(
		`SELECT source_type AS name, COALESCE(SUM(amount), 0) AS value FROM xp_logs
		 WHERE user_id = ? AND created_at >= ? AND created_at < ? GROUP BY source_type ORDER BY value DESC`,
		uid, w.curStart(), w.end).Scan(&res.XPBySource).Error; err != nil {
		return MeResponse{}, err
	}
	if err := config.DB.Raw(`SELECT COUNT(*) FROM scrolls WHERE author_id = ? AND status = 'published'`, uid).Scan(&res.PublishedScrolls).Error; err != nil {
		return MeResponse{}, err
	}
	res.CurrentStreak = gamification.CurrentCount(uid, "daily_login", time.Now())
	return res, nil
}

func getMentor(uid uint, w window) (MentorResponse, error) {
	data, err := w.run(map[string]metric{
		"growth":   {count, "users", "mentor_since", "mentor_id = ?", []any{uid}},
		"approved": {count, "scrolls", "reviewed_at", "reviewed_by_id = ? AND status = 'published'", []any{uid}},
	})
	if err != nil {
		return MentorResponse{}, err
	}

	res := MentorResponse{
		Range: w.rng, Granularity: w.step,
		NewApprentices: w.kpi(data["growth"]), Growth: w.points(data["growth"]),
		Approved: w.kpi(data["approved"]), ApprovedSeries: w.points(data["approved"]),
		Roster: []RosterRow{},
	}

	if err := config.DB.Raw(`SELECT COUNT(*) FROM users WHERE mentor_id = ? AND is_active = true`, uid).Scan(&res.ApprenticeCount).Error; err != nil {
		return MentorResponse{}, err
	}
	if err := config.DB.Raw(`
		SELECT u.id, u.full_name, u.username, u.current_level AS level,
		       (SELECT COUNT(*) FROM scrolls s WHERE s.author_id = u.id AND s.status = 'published') AS published_scrolls,
		       COALESCE((SELECT SUM(x.amount) FROM xp_logs x WHERE x.user_id = u.id AND x.created_at >= ? AND x.created_at < ?), 0) AS xp_in_range
		FROM users u WHERE u.mentor_id = ? AND u.is_active = true
		ORDER BY xp_in_range DESC, u.created_at ASC`, w.curStart(), w.end, uid).Scan(&res.Roster).Error; err != nil {
		return MentorResponse{}, err
	}
	// Scrolls this reviewer could act on: pending ones that are not their own. updated_at is when they were submitted.
	if err := config.DB.Raw(`
		SELECT COUNT(*) AS pending,
		       COALESCE(EXTRACT(EPOCH FROM (NOW() - MIN(updated_at))) / 3600, 0) AS oldest_hours,
		       COALESCE(AVG(EXTRACT(EPOCH FROM (NOW() - updated_at))) / 3600, 0) AS avg_hours
		FROM scrolls WHERE status = 'pending' AND author_id <> ?`, uid).Scan(&res.Review).Error; err != nil {
		return MentorResponse{}, err
	}
	return res, nil
}

func getPlatform(w window) (PlatformResponse, error) {
	data, err := w.run(map[string]metric{
		"views":     {count, "scroll_reads", "first_read_at", "", nil},
		"likes":     {count, "likes", "created_at", "", nil},
		"bookmarks": {count, "bookmarks", "created_at", "", nil},
		"comments":  {count, "comments", "created_at", "", nil},
		"published": {count, "scrolls", "published_at", "status = 'published'", nil},
		"newUsers":  {count, "users", "created_at", "", nil},
		"xp":        {sumXP, "xp_logs", "created_at", "", nil},
		"active":    {"COUNT(DISTINCT user_id)", "xp_logs", "created_at", "reason = 'login_streak'", nil},
	})
	if err != nil {
		return PlatformResponse{}, err
	}

	res := PlatformResponse{
		Range: w.rng, Granularity: w.step,
		Series:      make([]PlatformPoint, 0, w.n),
		UsersByRole: []Named{}, ScrollsByStatus: []Named{}, ByCategory: []Named{},
		TopAuthors: []TopAuthor{}, Challenges: ChallengeStats{Submissions: []Named{}},
	}
	for _, b := range w.cur() {
		k := w.key(b)
		res.Series = append(res.Series, PlatformPoint{
			Date: k, ActiveUsers: data["active"][k], Views: data["views"][k], Likes: data["likes"][k], Bookmarks: data["bookmarks"][k],
			Comments: data["comments"][k], Published: data["published"][k], NewUsers: data["newUsers"][k], XP: data["xp"][k],
		})
	}
	res.Kpis = PlatformKpis{
		NewUsers: w.kpi(data["newUsers"]), Published: w.kpi(data["published"]), Views: w.kpi(data["views"]),
		Likes: w.kpi(data["likes"]), Comments: w.kpi(data["comments"]), XP: w.kpi(data["xp"]),
	}

	// Distinct users over the whole range (not the sum of per-bucket distincts).
	distinct := func(from, to time.Time) (n int64) {
		config.DB.Raw(`SELECT COUNT(DISTINCT user_id) FROM xp_logs WHERE reason = 'login_streak' AND created_at >= ? AND created_at < ?`, from, to).Scan(&n)
		return
	}
	res.Kpis.ActiveUsers = Kpi{Total: distinct(w.curStart(), w.end), Previous: distinct(w.prevStart(), w.curStart())}

	queries := []struct {
		sql  string
		dest any
		args []any
	}{
		{`SELECT COUNT(*) FROM users WHERE is_active = true`, &res.TotalUsers, nil},
		{`SELECT COUNT(*) FROM scrolls WHERE status = 'pending'`, &res.PendingScrolls, nil},
		{`SELECT role AS name, COUNT(*) AS value FROM users WHERE is_active = true GROUP BY role ORDER BY value DESC`, &res.UsersByRole, nil},
		{`SELECT status AS name, COUNT(*) AS value FROM scrolls GROUP BY status ORDER BY value DESC`, &res.ScrollsByStatus, nil},
		{`SELECT c.name AS name, COUNT(s.id) AS value FROM categories c
		  LEFT JOIN scrolls s ON s.category_id = c.id AND s.status = 'published'
		  WHERE c.is_active = true AND c.id NOT IN (SELECT parent_id FROM categories WHERE parent_id IS NOT NULL)
		  GROUP BY c.id, c.name ORDER BY value DESC, c.name`, &res.ByCategory, nil},
		{`SELECT COUNT(*) FROM challenges WHERE is_published = true AND start_date <= NOW() AND end_date >= NOW()`, &res.Challenges.Active, nil},
		{`SELECT status AS name, COUNT(*) AS value FROM challenge_submissions GROUP BY status ORDER BY value DESC`, &res.Challenges.Submissions, nil},
		{`SELECT * FROM (
		    SELECT u.id, u.full_name, u.username,
		      (SELECT COUNT(*) FROM scrolls s WHERE s.author_id = u.id AND s.status = 'published' AND s.published_at >= ? AND s.published_at < ?) AS published,
		      (SELECT COUNT(*) FROM likes l JOIN scrolls s ON s.id = l.scroll_id
		         WHERE s.author_id = u.id AND l.user_id <> u.id AND l.created_at >= ? AND l.created_at < ?) AS likes
		    FROM users u WHERE u.is_active = true) t
		  WHERE published > 0 OR likes > 0 ORDER BY published DESC, likes DESC LIMIT 10`, &res.TopAuthors,
			[]any{w.curStart(), w.end, w.curStart(), w.end}},
	}
	for _, q := range queries {
		if err := config.DB.Raw(q.sql, q.args...).Scan(q.dest).Error; err != nil {
			return PlatformResponse{}, err
		}
	}
	return res, nil
}
