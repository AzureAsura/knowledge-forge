package main

// persona drives both the profile and the simulated behaviour of one account.
type persona struct {
	FullName, Username, Role, Bio, Avatar string
	JoinAgo                               int    // days since the account was created
	Mentor                                string // username of the senior mentoring this account
	LastLoginAgo                          int    // 0 = active today, 1 = last seen yesterday (streak at risk), larger = lapsed
	StreakDays                            int    // forced consecutive login days ending LastLoginAgo days ago
	Activity                              float64
	Reader                                float64 // mean scrolls read per active day
}

const (
	face  = "https://randomuser.me/api/portraits/"
	toon  = "https://api.dicebear.com/9.x/"
	anime = "https://wsrv.nl/?w=256&h=256&fit=cover&a=top&output=webp&url=nekos.best/api/v2/neko/"
)

// Avatars: 6 photos, 5 anime, 5 illustrations; one account has none so the initials fallback shows.
var people = []persona{
	{"Kevin Hartanto", "kevin_h", "admin", "Studio lead & project manager at Palm Studio. Keeps the roadmap honest and the retros short.", face + "men/75.jpg", 175, "", 0, 60, 0.8, 1.2},
	{"Raka Mahendra", "raka_m", "senior", "Frontend lead. React, TypeScript and a mild obsession with bundle size. Reviews scrolls before coffee.", face + "men/32.jpg", 170, "", 0, 45, 0.85, 2},
	{"Ni Putu Sari Dewi", "sari_dewi", "senior", "Backend engineer — Go, Postgres, and writing runbooks nobody asked for (until the incident).", face + "women/44.jpg", 168, "", 0, 30, 0.85, 1.8},
	{"Arief Santoso", "arief_s", "senior", "Unity gameplay programmer. 2D platformers by day, shader experiments by night.", anime + "905a7be7-58e9-47f8-bebd-165e52ccf5aa.png", 165, "", 1, 12, 0.8, 1.5},
	{"Maya Kusuma", "maya_kusuma", "senior", "Design lead. Believes a good design token saves ten meetings.", toon + "lorelei/svg?seed=MayaKusuma&backgroundColor=ffd5dc", 160, "", 0, 20, 0.8, 1.6},
	{"Bayu Wicaksono", "bayu_w", "senior", "XR developer working on Meta Quest builds. Motion sickness is a bug, not a feature.", face + "men/67.jpg", 150, "", 0, 9, 0.75, 1.4},

	{"Dewi Lestari", "dewilestari", "scholar", "Junior frontend dev learning in public. Currently fighting with useEffect.", face + "women/68.jpg", 140, "raka_m", 0, 38, 0.85, 3},
	{"Fajar Nugroho", "fajarnug", "scholar", "Game dev intern. Tilemaps, sprites, and too many Unity packages.", anime + "31687296-3750-4d95-9075-806c1df2aa4f.png", 130, "arief_s", 1, 7, 0.7, 2.5},
	{"Putri Ayu Rahma", "putriayu", "scholar", "UI designer in training. Figma shortcuts collector.", toon + "adventurer/svg?seed=PutriAyu&backgroundColor=ffdfbf", 120, "maya_kusuma", 0, 15, 0.7, 2},
	{"Komang Adi Wiratama", "komang_adi", "scholar", "Backend newbie from Singaraja. Writes SQL slowly but correctly.", face + "men/45.jpg", 115, "sari_dewi", 0, 21, 0.8, 2.5},
	{"Intan Permata", "intanp", "scholar", "VR enthusiast. Owns three headsets and a very patient chiropractor.", anime + "cc57fd3e-3d68-4fa3-bedf-685d22abad29.png", 105, "arief_s", 3, 0, 0.45, 1.5},
	{"Rizky Maulana", "rizkymaul", "scholar", "Fullstack generalist. Reads more scrolls than he writes.", toon + "notionists/svg?seed=Rizky&backgroundColor=c0aede", 95, "", 0, 4, 0.75, 3.5},
	{"Salsabila Nur", "salsa_nur", "scholar", "Product designer. Loves accessibility audits and sticky notes.", face + "women/12.jpg", 85, "maya_kusuma", 0, 10, 0.75, 2},
	{"Gede Surya", "gedesurya", "scholar", "Game programmer. Learning Unity from the Quest side of the studio.", toon + "adventurer/svg?seed=GedeSurya&backgroundColor=b6e3f4", 70, "arief_s", 2, 0, 0.4, 1.2},
	{"Hendra Gunawan", "hendrag", "scholar", "Backend trainee. Still learning what an index actually does.", "", 40, "", 9, 0, 0.3, 1},
	{"Citra Anggraini", "citraang", "scholar", "Just joined Palm Studio as a UI designer. Hi!", face + "women/26.jpg", 14, "", 0, 12, 0.9, 3},
}

// readStreak: consecutive recent days on which the account reads one not-yet-read scroll (first reads are all the backend counts).
var readStreak = map[string]int{
	"dewilestari": 7, "fajarnug": 4, "putriayu": 3, "komang_adi": 9, "rizkymaul": 12, "salsa_nur": 5, "citraang": 6,
	"raka_m": 2, "kevin_h": 5, "bayu_w": 3, "maya_kusuma": 2, "intanp": 2, "gedesurya": 1,
}
