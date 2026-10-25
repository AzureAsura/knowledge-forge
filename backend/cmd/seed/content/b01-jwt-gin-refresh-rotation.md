---
title: JWT Auth di Go + Gin: Access Token, Refresh Token Rotation, dan Reuse Detection
author: sari_dewi
category: web-backend
difficulty: intermediate
status: published
age: 26
featured: true
cover: unsplash:1563986768609-322da13575f3
---

Hampir semua tutorial JWT berhenti di langkah "buat token, verifikasi token". Itu cukup untuk demo, tapi tidak untuk produksi. Pertanyaan yang tidak dijawab: *apa yang terjadi kalau token dicuri? Bagaimana cara logout yang sebenarnya? Bagaimana user tetap login berminggu-minggu tanpa token yang hidup selamanya?*

Scroll ini menjelaskan desain yang kami pakai di KnoFo: **access token berumur pendek + refresh token yang berotasi + deteksi pemakaian ulang**. Contohnya dalam Go dengan Gin dan GORM, tapi konsepnya berlaku di bahasa apa pun.

![Gembok merah di atas keyboard](unsplash:1614064641938-3bbee52942c7)
*Token yang bisa dipakai selamanya adalah password yang tidak bisa diganti.*

## Dua token, dua tugas

| | Access token | Refresh token |
|---|---|---|
| Fungsi | Membuktikan identitas di setiap request | Menukar dengan access token baru |
| Umur | Pendek (15 menit) | Panjang (7–30 hari) |
| Format | JWT bertanda tangan (stateless) | String acak opak (disimpan di DB) |
| Disimpan server? | Tidak | Ya, **hash**-nya |
| Dikirim ke | Semua endpoint API | Hanya `/auth/refresh` dan `/auth/logout` |

Idenya: kalau access token bocor, kerusakannya terbatas 15 menit. Refresh token bisa dicabut kapan saja karena ada di database.

## Access token: JWT

```go
type Claims struct {
	UserID uint   `json:"uid"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

func GenerateAccessToken(userID uint, role string) (string, error) {
	claims := Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).
		SignedString([]byte(os.Getenv("JWT_SECRET")))
}
```

Aturan penting saat memverifikasi:

```go
func ParseAccessToken(raw string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(raw, &Claims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method %v", t.Header["alg"])
		}
		return []byte(os.Getenv("JWT_SECRET")), nil
	})
	if err != nil || !token.Valid {
		return nil, errors.New("invalid token")
	}
	return token.Claims.(*Claims), nil
}
```

Pemeriksaan `t.Method` mencegah serangan **algorithm confusion** (penyerang mengganti header `alg` menjadi `none` atau algoritma lain). Selalu batasi algoritma yang diterima.

Catatan jujur: karena role ada di klaim, perubahan role baru berlaku setelah token berikutnya (≤ 15 menit). Itu trade-off stateless yang harus kamu terima atau tutup dengan cek database untuk aksi sensitif.

![Pengembang bekerja di lingkungan gelap dengan banyak layar](unsplash:1510915228340-29c85a43dcfe)
*Pengembang bekerja di lingkungan gelap dengan banyak layar.*

## Middleware Gin

```go
func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		raw, ok := strings.CutPrefix(header, "Bearer ")
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "missing token"})
			return
		}
		claims, err := utils.ParseAccessToken(raw)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "invalid or expired token"})
			return
		}
		c.Set("userID", claims.UserID)
		c.Set("role", claims.Role)
		c.Next()
	}
}
```

Gunakan `AbortWithStatusJSON`, bukan `JSON` saja, supaya handler berikutnya tidak ikut jalan.

## Refresh token: acak, opak, di-hash

Refresh token **bukan JWT**. Cukup byte acak yang kuat:

```go
func GenerateRefreshToken() (raw string, hash string, err error) {
	b := make([]byte, 32)
	if _, err = rand.Read(b); err != nil {
		return
	}
	raw = base64.RawURLEncoding.EncodeToString(b)
	sum := sha256.Sum256([]byte(raw))
	hash = hex.EncodeToString(sum[:])
	return
}
```

Yang disimpan di database hanya **hash SHA-256**. Kalau database bocor, penyerang tidak mendapat token yang bisa dipakai. SHA-256 cukup di sini (bukan bcrypt) karena token sudah berentropi tinggi, bukan password buatan manusia.

Skema tabel:

```go
type RefreshToken struct {
	ID         uint      `gorm:"primaryKey"`
	UserID     uint      `gorm:"not null;index"`
	FamilyID   string    `gorm:"not null;index"` // satu "sesi login"
	TokenHash  string    `gorm:"uniqueIndex;not null"`
	ExpiresAt  time.Time `gorm:"not null"`
	RevokedAt  *time.Time
	ReplacedBy *uint
	CreatedAt  time.Time
}
```

`FamilyID` mengelompokkan semua token yang berasal dari satu login. Ini kunci untuk bagian berikutnya.

## Rotasi: setiap refresh menghasilkan token baru

Setiap kali klien menukar refresh token, server:

1. mencari baris berdasarkan hash token yang dikirim;
2. memastikan belum kedaluwarsa dan **belum dicabut**;
3. menandai baris itu `RevokedAt = now` dan mencatat `ReplacedBy`;
4. membuat refresh token baru dengan `FamilyID` yang sama;
5. mengembalikan access token baru + refresh token baru.

```go
func refresh(raw string) (Tokens, error) {
	hash := hashToken(raw)
	var rt model.RefreshToken
	if err := config.DB.Where("token_hash = ?", hash).First(&rt).Error; err != nil {
		return Tokens{}, ErrInvalidToken
	}

	if rt.RevokedAt != nil {
		// Token lama dipakai lagi => kemungkinan dicuri. Cabut seluruh keluarga.
		config.DB.Model(&model.RefreshToken{}).
			Where("family_id = ? AND revoked_at IS NULL", rt.FamilyID).
			Update("revoked_at", time.Now())
		return Tokens{}, ErrReuseDetected
	}
	if time.Now().After(rt.ExpiresAt) {
		return Tokens{}, ErrInvalidToken
	}
	// ... rotasi di dalam transaksi
}
```

## Reuse detection: kenapa rotasi saja belum cukup

Bayangkan penyerang mencuri refresh token `R1`.

- Jika **penyerang** memakai `R1` lebih dulu → ia dapat `R2`. Saat user asli memakai `R1`, server melihat `R1` sudah dicabut dipakai lagi → **cabut seluruh family**, keduanya keluar. User asli login ulang; penyerang kehilangan akses.
- Jika **user asli** memakai `R1` lebih dulu → dapat `R2`. Saat penyerang memakai `R1`, server melihat reuse → cabut family. Penyerang mendapat error.

Tanpa deteksi reuse, penyerang yang memegang token lama bisa memakainya tanpa ketahuan sampai kedaluwarsa. Dengan rotasi + deteksi, **pencurian terlihat** dan dapat dihentikan.

### Pitfall: race condition di dua tab

Kebalikan yang menjengkelkan: user membuka dua tab, dan keduanya me-refresh bersamaan dengan `R1`. Tab A menang, tab B dianggap reuse, dan seluruh sesi dicabut. User terlogout tanpa sebab.

Solusi di frontend: serialisasi refresh dengan **Web Locks API** (`navigator.locks.request('refresh', ...)`) dan baca refresh token terbaru *di dalam* lock. Solusi di backend yang lebih toleran: beri *grace window* beberapa detik di mana token yang baru saja dirotasi masih dianggap valid untuk request yang sama. Kami memilih solusi frontend karena lebih sederhana dan tidak melemahkan deteksi.

## Logout yang sebenarnya

```go
func logout(raw string) error {
	hash := hashToken(raw)
	return config.DB.Model(&model.RefreshToken{}).
		Where("token_hash = ? AND revoked_at IS NULL", hash).
		Update("revoked_at", time.Now()).Error
}
```

Logout = mencabut refresh token. Access token tetap valid sampai kedaluwarsa (maksimal 15 menit); itu harga stateless. Untuk **ganti password**, cabut semua refresh token milik user (`WHERE user_id = ?`) sehingga semua perangkat keluar.

## Di mana klien menyimpan token?

| Tempat | Risiko | Catatan |
|---|---|---|
| Memori JS (variabel) | Hilang saat refresh halaman | Paling aman dari XSS untuk access token |
| `localStorage` | Bisa dicuri XSS | Mudah, tapi harus ketat soal XSS |
| Cookie `HttpOnly; Secure; SameSite` | CSRF perlu ditangani | Terbaik untuk refresh token |

Kompromi kami saat ini: access token di memori, refresh token di `localStorage`, dengan markdown tanpa HTML mentah untuk mengecilkan permukaan XSS. Target berikutnya adalah memindahkan refresh token ke cookie `HttpOnly`.

## Rate limit login

Tambahkan pembatas pada `/auth/login` (misalnya 5 percobaan per 15 menit per IP) dan jangan bedakan pesan "email tidak ada" dari "password salah". Pesan seragam mencegah enumerasi akun.

## Checklist produksi

- [ ] `JWT_SECRET` panjang (≥ 32 byte acak), dari environment, bukan dari kode.
- [ ] Verifikasi metode tanda tangan.
- [ ] Access token pendek; refresh token di database dalam bentuk hash.
- [ ] Rotasi + deteksi reuse berbasis family.
- [ ] Cabut semua token saat ganti password / nonaktifkan akun.
- [ ] Rate limit login dan refresh.
- [ ] Cek `is_active` user saat refresh, bukan hanya saat login.

## Penutup

Autentikasi yang baik bukan soal library JWT yang dipakai, tapi desain siklus hidup token: siapa yang bisa dicabut, kapan, dan bagaimana pencurian terdeteksi. Dua tabel kecil dan satu aturan reuse memberi lebih banyak keamanan daripada sembarang rumit-rumit kriptografi tambahan.

Referensi: RFC 6749 §10.4 (refresh token security), OWASP *JSON Web Token for Java Cheat Sheet* (prinsipnya berlaku umum), dan dokumentasi `golang-jwt/jwt`.

<!--comments-->
komang_adi: Kak Sari, bagian reuse detection membuat saya akhirnya paham kenapa kemarin saya terlogout padahal tidak melakukan apa-apa. Saya membuka dua tab dan keduanya refresh bersamaan, kan?
sari_dewi: Hampir pasti, Komang. Itu persis race condition yang dijelaskan. Di frontend sudah ada Web Locks untuk menyerialisasi refresh, tapi kalau kamu menyalin kode lama, bisa saja belum terpasang.
raka_m: Konfirmasi dari sisi frontend: lock-nya ada di lib/api/session. Poin tambahan, baca refresh token terbaru dari storage di dalam lock, bukan sebelum lock diambil. Bug yang sama pernah saya buat.
rizkymaul: Kenapa SHA-256 dan bukan bcrypt untuk hash refresh token? Banyak yang bilang selalu bcrypt untuk apa pun yang rahasia.
sari_dewi: Pertanyaan bagus. Bcrypt sengaja lambat untuk melindungi input berentropi rendah (password manusia). Refresh token itu 32 byte acak; brute force tidak realistis, jadi hash cepat sudah cukup dan tidak membebani setiap refresh.
hendrag: Apakah kita perlu menyimpan IP atau user agent di tabel refresh token untuk fitur 'perangkat yang sedang login'?
sari_dewi: Bisa, Hendra, dan berguna untuk UI "kelola sesi". Tapi itu fitur baru; sekarang kita hanya butuh family untuk revoke. Silakan buat usulan di backlog.
