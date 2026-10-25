package main

import (
	"fmt"
	"time"

	"backend/shared/gamification"
	"backend/shared/model"
)

type chalSub struct {
	User, Proof, Notes string
	Status             string // approved | rejected | pending
	Reason             string
	Reviewer           string
	SubmitAgo          float64 // days ago
	ReviewAfterH       float64
}

type chalSpec struct {
	Title, Description, Category string
	XP, StartAgo, EndIn          int // days: started StartAgo days ago, ends EndIn days from now (negative = ended)
	Published                    bool
	Subs                         []chalSub
}

var challengeSpecs = []chalSpec{
	{"Bug Hunt: Temukan Memory Leak", "Cari satu memory leak nyata di project Palm Studio (event listener, subscription, atau closure yang menahan referensi). Tulis akar masalah dan perbaikannya, lalu kirim link PR atau gist sebagai bukti.", "web-frontend", 150, 62, -40, true, []chalSub{
		{"dewilestari", "https://github.com/palm-studio/dashboard/pull/412", "Listener resize di useChartSize tidak pernah dilepas. Fix: cleanup di return effect.", "approved", "", "raka_m", 47, 20},
		{"komang_adi", "https://github.com/palm-studio/api-core/pull/188", "Goroutine leak di worker email: channel tidak pernah ditutup saat shutdown.", "approved", "", "sari_dewi", 45, 30},
		{"rizkymaul", "https://gist.github.com/rizkymaul/3f1c2e", "Saya rasa ini leak tapi belum sempat profiling.", "rejected", "Belum ada bukti heap snapshot atau profil. Tambahkan before/after lalu kirim ulang di challenge berikutnya.", "raka_m", 44, 8},
	}},
	{"Design Token Sprint", "Ubah satu layar produk Palm Studio agar sepenuhnya memakai design token (warna, spacing, tipografi) tanpa nilai hardcode. Sertakan before/after dan daftar token yang dipakai.", "design-ui", 200, 33, -14, true, []chalSub{
		{"salsa_nur", "https://www.figma.com/community/file/1204511920", "Layar checkout — 41 nilai hardcode jadi 0, 23 token.", "approved", "", "maya_kusuma", 20, 26},
		{"putriayu", "https://www.figma.com/community/file/1204517733", "Layar profil. Spacing sudah token, warna sebagian.", "approved", "", "maya_kusuma", 19, 40},
	}},
	{"Dokumentasikan Satu Modul Lama", "Pilih satu modul tanpa dokumentasi, lalu tulis README singkat: tujuan, cara pakai, dan satu gotcha. Kirim link commit atau halaman wiki.", "project-management", 250, 10, 20, true, []chalSub{
		{"intanp", "https://github.com/palm-studio/vr-toolkit/blob/main/docs/locomotion.md", "Dokumentasi locomotion rig + tabel setting comfort.", "approved", "", "kevin_h", 5, 18},
		{"fajarnug", "https://github.com/palm-studio/platformer-kit/blob/main/README.md", "README untuk Tilemap Brush kit.", "pending", "", "", 1.5, 0},
		{"hendrag", "https://github.com/palm-studio/api-core/blob/main/docs/migrations.md", "Cara menjalankan migrasi lokal.", "pending", "", "", 0.7, 0},
	}},
	{"Quest Comfort Audit", "Jalankan build VR terbaru di Quest selama 20 menit, catat setiap momen tidak nyaman (nausea, jitter, UI terlalu dekat), dan usulkan tiga perbaikan terukur.", "unity-vr", 300, 9, 2, true, []chalSub{
		{"gedesurya", "https://docs.google.com/document/d/1QuestComfortAuditGede/edit", "Tiga masalah: vignette terlalu lambat, UI 0.6 m, snap turn 30°.", "approved", "", "bayu_w", 3, 15},
		{"dewilestari", "https://docs.google.com/document/d/1QuestComfortAuditDewi/edit", "Pertama kali pakai headset, catatan dari sisi pemula.", "pending", "", "", 0.4, 0},
	}},
	{"Release Retrospective Week", "Tulis retrospektif rilis terakhir: apa yang berjalan baik, apa yang tersendat, dan satu eksperimen proses untuk sprint berikutnya.", "project-management", 180, -7, 21, true, nil},
	{"Performance Budget Week", "Tetapkan performance budget (LCP, TBT, ukuran bundle) untuk satu halaman dan buktikan dengan laporan Lighthouse CI.", "web-frontend", 220, -21, 28, false, nil},
}

func (s *sim) challenges() {
	var challID, subID uint
	for _, spec := range challengeSpecs {
		challID++
		cat := s.cats[spec.Category]
		start := dayStart(spec.StartAgo)
		end := dayStart(-spec.EndIn).Add(23*time.Hour + 59*time.Minute)
		s.chals = append(s.chals, model.Challenge{
			ID: challID, Title: spec.Title, Description: spec.Description, CategoryID: &cat, XPReward: spec.XP,
			StartDate: start, EndDate: end, IsPublished: spec.Published, CreatedAt: start.AddDate(0, 0, -3), UpdatedAt: start.AddDate(0, 0, -3),
		})
		for _, cs := range spec.Subs {
			subID++
			u := s.byName[cs.User]
			sub := model.ChallengeSubmission{
				ID: subID, ChallengeID: challID, UserID: u.ID, ProofURL: cs.Proof, Notes: cs.Notes, Status: cs.Status,
			}
			t := nowT.Add(-time.Duration(cs.SubmitAgo * 24 * float64(time.Hour)))
			sub.CreatedAt, sub.UpdatedAt = t, t
			idx := len(s.subs)
			s.subs = append(s.subs, sub)
			s.at(u, t, func() {})
			if cs.Status == "pending" {
				s.subs[idx].Status = model.ChallengeSubmissionPending
				continue
			}
			rev := s.byName[cs.Reviewer]
			rt := t.Add(time.Duration(cs.ReviewAfterH * float64(time.Hour)))
			s.subs[idx].Status = cs.Status
			s.subs[idx].RejectReason = cs.Reason
			s.subs[idx].ReviewedBy = &rev.ID
			s.subs[idx].ReviewedAt = &rt
			s.subs[idx].UpdatedAt = rt
			xp, sid, userRef, reward := cs.Status == "approved", subID, u, spec.XP
			s.at(rev, rt, func() {
				if xp {
					s.award(userRef, reward, "challenge_approved", "challenge", sid, rt)
				}
			})
		}
	}
}

// manual badges handed out by admins/seniors
func (s *sim) grants() {
	grant := func(user, slug, by string, ago float64) {
		u, g := s.byName[user], s.byName[by]
		for _, b := range allBadges() {
			if b.Slug == slug {
				t := nowT.Add(-time.Duration(ago * 24 * float64(time.Hour)))
				s.at(g, t, func() { s.unlock(u, b, t, &g.ID) })
			}
		}
	}
	grant("komang_adi", "bug-archaeologist", "sari_dewi", 44)
	grant("dewilestari", "bug-archaeologist", "raka_m", 46)
	grant("salsa_nur", "sop-guardian", "kevin_h", 25)
	grant("raka_m", "sop-guardian", "kevin_h", 70)
}

func (s *sim) visitsGen() {
	seen := map[string]bool{}
	for i := 0; i < 260; i++ {
		v := s.users[s.rng.Intn(len(s.users))]
		p := s.users[s.rng.Intn(len(s.users))]
		if v.ID == p.ID || len(v.active) == 0 {
			continue
		}
		var days []int
		for d := range v.active {
			if d <= p.p.JoinAgo {
				days = append(days, d)
			}
		}
		if len(days) == 0 {
			continue
		}
		d := days[s.rng.Intn(len(days))]
		date := dayStart(d)
		k := fmt.Sprint(p.ID, "|", v.ID, "|", d)
		if seen[k] {
			continue
		}
		seen[k] = true
		s.visits = append(s.visits, model.ProfileVisit{ProfileUserID: p.ID, VisitorID: v.ID, VisitDate: date, CreatedAt: date.Add(12 * time.Hour)})
	}
}
func allBadges() []gamification.BadgeDefinition { return gamification.AllBadgeDefinitions() }
