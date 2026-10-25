package main

import (
	"fmt"
	"log"
	"math"
	"math/rand"
	"sort"
	"time"

	"backend/shared/gamification"
	"backend/shared/model"
	"backend/shared/utils"
)

// The simulation replays the platform's own rules (XP amounts, daily caps, streaks, topic mastery, badges) over the
// last N days and keeps every row in memory with a historical timestamp; flush() writes them in one go.
// Constants mirror features/scroll/scrollService.go and features/engagement/engagementService.go.
const (
	xpScrollPublished  = 50
	xpTopicPublish     = 30
	xpScrollRead       = 2
	dailyCapRead       = 20
	xpTopicRead        = 5
	dailyCapTopicRead  = 50
	xpMentorPassive    = 20
	xpLikeReceived     = 5
	maxLikeReceivedXP  = 50
	xpBookmarkReceived = 10
	xpTopicBookmark    = 2
	dailyCapTopicBook  = 20
	xpCommentCreated   = 5
	dailyCapComment    = 30
)

var (
	jkt  *time.Location
	nowT time.Time
)

type simUser struct {
	model.User
	p         persona
	xp        int
	streaks   map[string]*model.UserStreak
	topics    map[uint]*model.TopicMastery
	badges    map[string]bool
	commented map[uint]bool
	cats      map[uint]bool
	pubWeeks  map[string]bool
	published int
	bookRecv  int
	active    map[int]bool
	joinAt    time.Time
}

type simScroll struct {
	model.Scroll
	d       draft
	author  *simUser
	readers map[uint]bool
	likers  map[uint]bool
	marked  map[uint]bool
}

type event struct {
	t   time.Time
	seq int
	fn  func()
}

type sim struct {
	rng      *rand.Rand
	users    []*simUser
	byName   map[string]*simUser
	scrolls  []*simScroll
	cats     map[string]uint
	events   []event
	dayFirst map[string]time.Time // "userID|dayAgo" → earliest activity, to place the login just before it
	seq      int

	logs      []model.XPLog
	logKeys   map[string]bool
	counters  map[string]int
	reads     []model.ScrollRead
	likes     []model.Like
	bookmarks []model.Bookmark
	comments  []model.Comment
	userBadge []model.UserBadge
	masteries []model.TopicMastery
	visits    []model.ProfileVisit
	chals     []model.Challenge
	subs      []model.ChallengeSubmission

	nextLog, nextLike, nextBook, nextComment, nextMastery, nextBadge uint
}

func dayStart(ago int) time.Time {
	n := nowT.In(jkt)
	return time.Date(n.Year(), n.Month(), n.Day()-ago, 0, 0, 0, 0, jkt)
}

func atHour(ago int, h float64) time.Time {
	return dayStart(ago).Add(time.Duration(h * float64(time.Hour)))
}

func dayAgoOf(t time.Time) int {
	return int(math.Round(dayStart(0).Sub(time.Date(t.In(jkt).Year(), t.In(jkt).Month(), t.In(jkt).Day(), 0, 0, 0, 0, jkt)).Hours() / 24))
}

func monday(t time.Time) time.Time {
	t = t.In(jkt)
	wd := int(t.Weekday())
	if wd == 0 {
		wd = 7
	}
	d := t.AddDate(0, 0, -(wd - 1))
	return time.Date(d.Year(), d.Month(), d.Day(), 0, 0, 0, 0, jkt)
}

func periodStart(typ string, t time.Time) time.Time {
	t = t.In(jkt)
	if typ == "weekly_scroll" {
		return monday(t)
	}
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, jkt)
}

func prevPeriod(typ string, ps time.Time) time.Time {
	if typ == "weekly_scroll" {
		return ps.AddDate(0, 0, -7)
	}
	return ps.AddDate(0, 0, -1)
}

func epochDays(t time.Time) uint {
	return uint(t.Sub(time.Date(2020, 1, 1, 0, 0, 0, 0, t.Location())).Hours() / 24)
}

func newSim(seed int64) *sim {
	return &sim{
		rng: rand.New(rand.NewSource(seed)), byName: map[string]*simUser{}, cats: map[string]uint{},
		dayFirst: map[string]time.Time{}, logKeys: map[string]bool{}, counters: map[string]int{},
		nextLog: 1, nextLike: 1, nextBook: 1, nextComment: 1, nextMastery: 1, nextBadge: 1,
	}
}

func (s *sim) chance(p float64) bool        { return s.rng.Float64() < p }
func (s *sim) between(a, b float64) float64 { return a + s.rng.Float64()*(b-a) }

// at schedules fn for time t (dropped when it would land in the future) and remembers the user's first activity of that day.
func (s *sim) at(u *simUser, t time.Time, fn func()) {
	if t.After(nowT.Add(-15 * time.Minute)) {
		return
	}
	if u != nil {
		k := fmt.Sprintf("%d|%d", u.ID, dayAgoOf(t))
		if first, ok := s.dayFirst[k]; !ok || t.Before(first) {
			s.dayFirst[k] = t
		}
	}
	s.seq++
	s.events = append(s.events, event{t, s.seq, fn})
}

// --- rules --------------------------------------------------------------------------------------------------

func (s *sim) award(u *simUser, amount int, reason, sourceType string, sourceID uint, t time.Time) {
	if amount <= 0 {
		return
	}
	key := fmt.Sprintf("%d|%s|%d", u.ID, reason, sourceID)
	if s.logKeys[key] {
		return
	}
	s.logKeys[key] = true
	s.logs = append(s.logs, model.XPLog{ID: s.nextLog, UserID: u.ID, Amount: amount, Reason: reason, SourceType: sourceType, SourceID: sourceID, CreatedAt: t})
	s.nextLog++
	u.xp += amount
}

func (s *sim) consume(u *simUser, key string, want, limit int, t time.Time) int {
	k := fmt.Sprintf("%d|%s|%s", u.ID, t.In(jkt).Format("2006-01-02"), key)
	granted := min(want, max(limit-s.counters[k], 0))
	s.counters[k] += granted
	return granted
}

func (s *sim) touch(u *simUser, typ string, t time.Time) (int, bool) {
	ps := periodStart(typ, t)
	row := u.streaks[typ]
	if row == nil {
		row = &model.UserStreak{UserID: u.ID, StreakType: typ}
		u.streaks[typ] = row
	}
	last := periodStart(typ, row.LastActivityDate)
	switch {
	case !row.LastActivityDate.IsZero() && last.Equal(ps):
		return row.CurrentCount, false
	case !row.LastActivityDate.IsZero() && last.Equal(prevPeriod(typ, ps)):
		row.CurrentCount++
	default:
		row.CurrentCount = 1
	}
	row.LongestCount = max(row.LongestCount, row.CurrentCount)
	row.LastActivityDate = ps
	return row.CurrentCount, true
}

func (s *sim) topic(u *simUser, cat uint) *model.TopicMastery {
	m := u.topics[cat]
	if m == nil {
		m = &model.TopicMastery{ID: s.nextMastery, UserID: u.ID, CategoryID: cat}
		s.nextMastery++
		u.topics[cat] = m
	}
	return m
}

func (s *sim) addTopicXP(u *simUser, cat uint, amount int, t time.Time) {
	if amount <= 0 {
		return
	}
	m := s.topic(u, cat)
	m.XPInTopic += amount
	m.LastActivityAt = &t
}

func (s *sim) checkTopicLevel(u *simUser, cat uint, t time.Time) {
	m := s.topic(u, cat)
	for m.Level < gamification.MaxLevel {
		next := m.Level + 1
		xp, contributed, read := gamification.GetTopicLevelRequirements(next)
		if m.XPInTopic < xp || m.ScrollsContributed < contributed || m.ScrollsRead < read {
			break
		}
		s.award(u, gamification.TopicLevelBonus(next), fmt.Sprintf("topic_level_%d", next), "topic_mastery", m.ID, t)
		m.Level = next
	}
}

func (s *sim) badgeProgress(u *simUser, b gamification.BadgeDefinition, t time.Time) bool {
	switch b.TriggerType {
	case "scroll_count":
		return u.published >= b.Count
	case "category_count":
		return len(u.cats) >= b.MinCategories
	case "scroll_bookmarks":
		return u.bookRecv >= b.Count
	case "comment_count":
		return len(u.commented) >= b.Count
	case "streak":
		n := 0
		for c := monday(t); u.pubWeeks[c.Format("2006-01-02")]; c = c.AddDate(0, 0, -7) {
			n++
		}
		return n >= b.Weeks
	}
	return false
}

func (s *sim) unlock(u *simUser, b gamification.BadgeDefinition, t time.Time, grantedBy *uint) {
	if u.badges[b.Slug] {
		return
	}
	u.badges[b.Slug] = true
	s.userBadge = append(s.userBadge, model.UserBadge{ID: s.nextBadge, UserID: u.ID, BadgeSlug: b.Slug, UnlockedAt: t, GrantedBy: grantedBy})
	s.nextBadge++
	s.award(u, b.XPReward, "badge_unlocked", "badge", b.ID, t)
}

func (s *sim) evaluate(u *simUser, t time.Time, triggers ...string) {
	want := map[string]bool{}
	for _, tr := range triggers {
		want[tr] = true
	}
	for range 3 {
		fresh := false
		for _, b := range gamification.AllBadgeDefinitions() {
			if b.TriggerType == "manual" || !want[b.TriggerType] || u.badges[b.Slug] || !s.badgeProgress(u, b, t) {
				continue
			}
			s.unlock(u, b, t, nil)
			fresh = true
		}
		if !fresh {
			return
		}
	}
}

func (s *sim) doLogin(u *simUser, t time.Time) {
	count, inc := s.touch(u, "daily_login", t)
	if inc {
		s.award(u, min(5*count, 50), "login_streak", "streak", epochDays(periodStart("daily_login", t)), t)
	}
}

func (s *sim) approve(sc *simScroll, reviewer *simUser, t time.Time) {
	a := sc.author
	sc.Status = model.ScrollStatusPublished
	sc.PublishedAt = &t
	sc.ReviewedByID = &reviewer.ID
	sc.ReviewedAt = &t
	if a.MentorID != nil && a.published == 0 {
		s.award(s.byID(*a.MentorID), xpMentorPassive, "mentor_pasif", "mentor", a.ID, t)
	}
	a.published++
	a.cats[sc.CategoryID] = true
	a.pubWeeks[monday(t).Format("2006-01-02")] = true
	s.award(a, xpScrollPublished, "scroll_published", "scroll", sc.ID, t)
	s.addTopicXP(a, sc.CategoryID, xpTopicPublish, t)
	s.topic(a, sc.CategoryID).ScrollsContributed++
	s.checkTopicLevel(a, sc.CategoryID, t)
	s.evaluate(a, t, "scroll_count", "category_count", "streak")
	s.touch(a, "weekly_scroll", t)
}

func (s *sim) byID(id uint) *simUser {
	for _, u := range s.users {
		if u.ID == id {
			return u
		}
	}
	log.Fatalf("no user %d", id)
	return nil
}

func (s *sim) read(u *simUser, sc *simScroll, t time.Time) {
	if sc.readers[u.ID] {
		return
	}
	sc.readers[u.ID] = true
	s.reads = append(s.reads, model.ScrollRead{ScrollID: sc.ID, UserID: u.ID, FirstReadAt: t})
	sc.ViewCount++
	s.touch(u, "daily_read", t)
	if sc.AuthorID == u.ID {
		return
	}
	if g := s.consume(u, "read", xpScrollRead, dailyCapRead, t); g > 0 {
		s.award(u, g, "scroll_read", "reading", sc.ID, t)
	}
	if g := s.consume(u, fmt.Sprintf("topic_read:%d", sc.CategoryID), xpTopicRead, dailyCapTopicRead, t); g > 0 {
		s.addTopicXP(u, sc.CategoryID, g, t)
	}
	s.topic(u, sc.CategoryID).ScrollsRead++
	s.checkTopicLevel(u, sc.CategoryID, t)
}

func (s *sim) like(u *simUser, sc *simScroll, t time.Time) {
	if sc.likers[u.ID] || sc.ID == 0 {
		return
	}
	sc.likers[u.ID] = true
	l := model.Like{ID: s.nextLike, ScrollID: sc.ID, UserID: u.ID, CreatedAt: t}
	s.nextLike++
	s.likes = append(s.likes, l)
	sc.LikesCount++
	if sc.AuthorID != u.ID && sc.LikesCount <= maxLikeReceivedXP/xpLikeReceived {
		s.award(sc.author, xpLikeReceived, "scroll_liked", "like", l.ID, t)
	}
}

func (s *sim) bookmark(u *simUser, sc *simScroll, t time.Time) {
	if sc.marked[u.ID] {
		return
	}
	sc.marked[u.ID] = true
	b := model.Bookmark{ID: s.nextBook, ScrollID: sc.ID, UserID: u.ID, CreatedAt: t}
	s.nextBook++
	s.bookmarks = append(s.bookmarks, b)
	sc.BookmarksCount++
	if sc.AuthorID == u.ID {
		return
	}
	a := sc.author
	a.bookRecv++
	s.award(a, xpBookmarkReceived, "scroll_bookmarked", "bookmark", b.ID, t)
	if g := s.consume(a, fmt.Sprintf("topic_bookmark:%d", sc.CategoryID), xpTopicBookmark, dailyCapTopicBook, t); g > 0 {
		s.addTopicXP(a, sc.CategoryID, g, t)
		s.checkTopicLevel(a, sc.CategoryID, t)
	}
	s.evaluate(a, t, "scroll_bookmarks")
}

func (s *sim) comment(u *simUser, sc *simScroll, text string, t time.Time) {
	c := model.Comment{ID: s.nextComment, ScrollID: sc.ID, AuthorID: u.ID, Content: text, CreatedAt: t, UpdatedAt: t}
	s.nextComment++
	s.comments = append(s.comments, c)
	sc.CommentsCount++
	u.commented[sc.ID] = true
	if sc.AuthorID == u.ID {
		return
	}
	if g := s.consume(u, "comment", xpCommentCreated, dailyCapComment, t); g > 0 {
		s.award(u, g, "comment_created", "comment", c.ID, t)
	}
	s.evaluate(u, t, "comment_count")
}

// --- generation ---------------------------------------------------------------------------------------------

func (s *sim) buildUsers(hash string, adminEnv persona) {
	all := append([]persona{adminEnv}, people...)
	for i, p := range all {
		join := atHour(p.JoinAgo, s.between(8, 10))
		u := &simUser{
			p: p, joinAt: join, streaks: map[string]*model.UserStreak{}, topics: map[uint]*model.TopicMastery{},
			badges: map[string]bool{}, commented: map[uint]bool{}, cats: map[uint]bool{}, pubWeeks: map[string]bool{}, active: map[int]bool{},
		}
		u.User = model.User{
			ID: uint(i + 1), FullName: p.FullName, Username: p.Username, Email: p.Username + "@knofo.local", PasswordHash: hash,
			Role: p.Role, Bio: p.Bio, AvatarURL: p.Avatar, IsActive: true, CurrentLevel: 1, Title: utils.TitleForLevel(1),
			CreatedAt: join, UpdatedAt: nowT,
		}
		s.users = append(s.users, u)
		s.byName[p.Username] = u
	}
	for _, u := range s.users {
		if u.p.Mentor == "" {
			continue
		}
		m := s.byName[u.p.Mentor]
		since := u.joinAt.AddDate(0, 0, 2)
		u.MentorID, u.MentorSince = &m.ID, &since
	}
}

func (s *sim) buildScrolls(drafts []draft) {
	for i, d := range drafts {
		a := s.byName[d.Author]
		cat, ok := s.cats[d.Category]
		if a == nil || !ok {
			log.Fatalf("%s: unknown author %q or category %q", d.File, d.Author, d.Category)
		}
		if a.p.JoinAgo <= d.Age+1 {
			log.Fatalf("%s: %s joined %d days ago but the scroll is %d days old", d.File, a.Username, a.p.JoinAgo, d.Age)
		}
		t := atHour(d.Age, s.between(9, 17))
		created := t.Add(-time.Duration(s.between(20, 70)) * time.Hour)
		if created.Before(a.joinAt.Add(2 * time.Hour)) {
			created = a.joinAt.Add(2 * time.Hour)
		}
		sc := &simScroll{d: d, author: a, readers: map[uint]bool{}, likers: map[uint]bool{}, marked: map[uint]bool{}}
		sc.Scroll = model.Scroll{
			ID: uint(i + 1), AuthorID: a.ID, CategoryID: cat, Title: d.Title, Slug: utils.Slugify(d.Title), Excerpt: excerpt(d.Body),
			Content: d.Body, CoverImageURL: d.Cover, Status: model.ScrollStatusDraft, Difficulty: d.Difficulty,
			IsFeatured: d.Featured, CreatedAt: created, UpdatedAt: created,
		}
		switch d.Status {
		case "pending":
			sc.Status = model.ScrollStatusPending
			sc.CreatedAt = t.Add(-30 * time.Hour)
			sc.UpdatedAt = t
		case "draft":
			sc.CreatedAt, sc.UpdatedAt = t, t
		}
		s.scrolls = append(s.scrolls, sc)
	}
}

func (s *sim) reviewers(exclude uint) []*simUser {
	var out []*simUser
	for _, u := range s.users {
		if (u.Role == model.RoleSenior || u.Role == model.RoleAdmin) && u.ID != exclude {
			out = append(out, u)
		}
	}
	return out
}

func (s *sim) published(sc *simScroll) bool {
	return sc.d.Status == "published" || sc.d.Status == "archived"
}

func (s *sim) generate() {
	// 1. approvals
	for _, sc := range s.scrolls {
		if !s.published(sc) {
			continue
		}
		rs := s.reviewers(sc.AuthorID)
		rev := rs[s.rng.Intn(len(rs))]
		t := atHour(sc.d.Age, s.between(9, 17))
		sc.PublishedAt = &t
		s.at(rev, t, func() { s.approve(sc, rev, t) })
		s.at(sc.author, t.Add(25*time.Minute), func() {}) // the author opens it right after approval
		if s.chance(0.85) {
			s.at(sc.author, t.Add(40*time.Minute), func() { s.read(sc.author, sc, t.Add(40*time.Minute)) })
		}
	}

	// 2. comments (forces the commenter to have read the scroll and be active that day)
	forcedRead := map[string]bool{}
	forcedDay := map[uint]map[int]bool{}
	for _, sc := range s.scrolls {
		if !s.published(sc) || sc.d.Status == "archived" {
			continue
		}
		cur := atHour(sc.d.Age, 9).Add(time.Duration(s.between(5, 40)) * time.Hour)
		for _, dc := range sc.d.Comments {
			u := s.byName[dc.Author]
			if u == nil {
				log.Fatalf("%s: comment by unknown user %q", sc.d.File, dc.Author)
			}
			cur = cur.Add(time.Duration(s.between(2, 38)) * time.Hour)
			t := cur
			if t.Before(u.joinAt.Add(24 * time.Hour)) {
				t = u.joinAt.Add(24 * time.Hour).Add(time.Duration(s.between(1, 5)) * time.Hour)
			}
			if limit := dayStart(u.p.LastLoginAgo).Add(22 * time.Hour); u.p.LastLoginAgo > 0 && t.After(limit) {
				continue
			}
			if t.After(nowT.Add(-2 * time.Hour)) {
				continue
			}
			if u.ID != sc.AuthorID {
				forcedRead[fmt.Sprintf("%d|%d", u.ID, sc.ID)] = true
				if forcedDay[u.ID] == nil {
					forcedDay[u.ID] = map[int]bool{}
				}
				forcedDay[u.ID][dayAgoOf(t)] = true
				rt := t.Add(-time.Duration(s.between(8, 25)) * time.Minute)
				s.at(u, rt, func() { s.read(u, sc, rt) })
			}
			text := dc.Text
			s.at(u, t, func() { s.comment(u, sc, text, t) })
			if u.ID != sc.AuthorID && s.chance(0.6) {
				lt := t.Add(time.Duration(s.between(1, 9)) * time.Minute)
				s.at(u, lt, func() { s.like(u, sc, lt) })
			}
			cur = t
		}
	}

	// 3. active days, random reads, likes and bookmarks
	for _, u := range s.users {
		p := u.p
		for d := p.JoinAgo; d >= 0; d-- {
			switch {
			case d < p.LastLoginAgo:
			case p.StreakDays > 0 && d == p.LastLoginAgo+p.StreakDays:
			case d < p.LastLoginAgo+p.StreakDays:
				u.active[d] = true
			default:
				prob := p.Activity
				if wd := atHour(d, 12).Weekday(); wd == time.Saturday || wd == time.Sunday {
					prob *= 0.5
				}
				if d == p.JoinAgo || forcedDay[u.ID][d] {
					prob = 1
				}
				if s.chance(prob) {
					u.active[d] = true
				}
			}
		}
		for d := range forcedDay[u.ID] {
			u.active[d] = true
		}
		for i := 0; i < readStreak[p.Username]; i++ {
			d := p.LastLoginAgo + i
			sc := s.pickScroll(u, d, forcedRead)
			if d > p.JoinAgo || sc == nil {
				break
			}
			forcedRead[fmt.Sprintf("%d|%d", u.ID, sc.ID)] = true
			u.active[d] = true
			t := atHour(d, s.between(9, 20))
			s.at(u, t, func() { s.read(u, sc, t) })
			if s.chance(0.5) {
				lt := t.Add(time.Duration(s.between(4, 30)) * time.Minute)
				s.at(u, lt, func() { s.like(u, sc, lt) })
			}
		}
		days := make([]int, 0, len(u.active))
		for d := range u.active {
			days = append(days, d)
		}
		sort.Sort(sort.Reverse(sort.IntSlice(days)))
		for _, d := range days {
			mean := p.Reader * 0.3
			if wd := atHour(d, 12).Weekday(); wd == time.Saturday || wd == time.Sunday {
				mean *= 0.6
			}
			n := int(mean)
			if s.chance(mean - float64(n)) {
				n++
			}
			if d == p.JoinAgo {
				n = max(n, 1)
			}
			for i := 0; i < n; i++ {
				sc := s.pickScroll(u, d, forcedRead)
				if sc == nil {
					break
				}
				t := atHour(d, s.between(8.5, 20)+float64(i)*0.3)
				if d == p.JoinAgo && t.Before(u.joinAt.Add(30*time.Minute)) {
					t = u.joinAt.Add(30 * time.Minute)
				}
				if t.Before(sc.PublishedAt.Add(time.Hour)) {
					continue
				}
				forcedRead[fmt.Sprintf("%d|%d", u.ID, sc.ID)] = true
				s.at(u, t, func() { s.read(u, sc, t) })
				if sc.AuthorID == u.ID {
					continue
				}
				if s.chance(0.42) {
					lt := t.Add(time.Duration(s.between(4, 40)) * time.Minute)
					s.at(u, lt, func() { s.like(u, sc, lt) })
				}
				if s.chance(0.2) {
					bt := t.Add(time.Duration(s.between(8, 70)) * time.Minute)
					s.at(u, bt, func() { s.bookmark(u, sc, bt) })
				}
			}
		}
	}

	// 4. logins: one per active day, placed just before that day's first activity
	for _, u := range s.users {
		for d := range u.active {
			t, ok := s.dayFirst[fmt.Sprintf("%d|%d", u.ID, d)]
			if ok {
				t = t.Add(-3 * time.Minute)
			} else {
				t = atHour(d, s.between(7, 21))
			}
			if d == u.p.JoinAgo && t.Before(u.joinAt.Add(5*time.Minute)) {
				t = u.joinAt.Add(5 * time.Minute)
			}
			u := u
			s.at(nil, t, func() { s.doLogin(u, t) })
		}
	}
}

func (s *sim) pickScroll(u *simUser, d int, taken map[string]bool) *simScroll {
	var cands []*simScroll
	var weights []float64
	total := 0.0
	for _, sc := range s.scrolls {
		if !s.published(sc) || sc.d.Age <= d || (sc.d.Status == "archived" && sc.d.Age-d > 40) {
			continue
		}
		if sc.AuthorID == u.ID || taken[fmt.Sprintf("%d|%d", u.ID, sc.ID)] {
			continue
		}
		w := 1.0
		if sc.IsFeatured {
			w += 2
		}
		if sc.d.Age-d < 10 {
			w += 2
		}
		cands, weights = append(cands, sc), append(weights, w)
		total += w
	}
	if len(cands) == 0 {
		return nil
	}
	r := s.rng.Float64() * total
	for i, w := range weights {
		if r < w {
			return cands[i]
		}
		r -= w
	}
	return cands[len(cands)-1]
}

func (s *sim) run() {
	sort.Slice(s.events, func(i, j int) bool {
		if !s.events[i].t.Equal(s.events[j].t) {
			return s.events[i].t.Before(s.events[j].t)
		}
		return s.events[i].seq < s.events[j].seq
	})
	for _, e := range s.events {
		e.fn()
	}
	for _, sc := range s.scrolls {
		if sc.d.Status == "archived" {
			sc.Status = model.ScrollStatusArchived
		}
		if sc.PublishedAt != nil {
			sc.UpdatedAt = *sc.PublishedAt
		}
	}
	for _, u := range s.users {
		level, title, _, _ := utils.LevelFromTotalXP(u.xp)
		u.TotalXP, u.CurrentLevel, u.Title = u.xp, level, title
	}
	log.Printf("simulated %d events → %d xp logs, %d reads, %d likes, %d bookmarks, %d comments, %d badges",
		len(s.events), len(s.logs), len(s.reads), len(s.likes), len(s.bookmarks), len(s.comments), len(s.userBadge))
}
