---
title: Rate Limiting Tanpa Redis: Fixed Window di Postgres untuk Tim Kecil
author: sari_dewi
category: web-backend
difficulty: intermediate
status: published
age: 5
featured: false
cover: unsplash:1510915228340-29c85a43dcfe
---

Setiap API yang bisa diakses publik akhirnya akan dipukul: bot yang mencoba ribuan password, skrip yang membuat komentar spam, atau klien yang punya bug dan memanggil endpoint dalam loop tak berujung. Pembatas laju (**rate limiter**) adalah pertahanan paling murah untuk semuanya.

Jawaban umumnya adalah "pasang Redis". Tapi tim kecil dengan satu database Postgres sering tidak ingin menambah komponen baru hanya untuk menghitung request. Scroll ini menjelaskan cara membuat **fixed window rate limiter** langsung di Postgres, kapan itu cukup, dan kapan kamu harus pindah ke solusi lain.

![Kabel jaringan terpasang rapi di rak](unsplash:1510915228340-29c85a43dcfe)
*Pembatas laju bukan hukuman, tapi pagar: ia melindungi pengguna yang jujur dari pengguna yang rusak.*

## Algoritma yang umum

| Algoritma | Cara kerja | Kelebihan | Kekurangan |
|---|---|---|---|
| **Fixed window** | Hitung request per jendela waktu tetap (misal tiap menit) | Paling sederhana, murah | Bisa 2× batas di batas jendela |
| **Sliding window log** | Simpan timestamp tiap request | Akurat | Memori/penyimpanan besar |
| **Sliding window counter** | Gabung dua jendela berbobot | Akurat cukup, murah | Sedikit lebih rumit |
| **Token bucket** | Ember token yang terisi tetap | Mengizinkan burst terkendali | Perlu simpan status + waktu |

Untuk melindungi login, komentar, dan upload, **fixed window sudah memadai**. Kita terima kelemahannya: pengguna bisa mengirim batas penuh di akhir jendela dan batas penuh lagi di awal jendela berikutnya (burst 2×). Untuk kasus kita itu tidak masalah.

## Desain tabel

```go
type RateLimit struct {
	Key         string    `gorm:"primaryKey"`
	WindowStart time.Time `gorm:"primaryKey"`
	Count       int       `gorm:"not null;default:0"`
}
```

Kunci komposit `(key, window_start)` adalah segalanya. `key` berisi identitas yang dibatasi dan jenis aksinya, misalnya `login:203.0.113.7` atau `comment:user:42`. `window_start` adalah awal jendela (waktu dibulatkan ke bawah).

![Papan sirkuit](unsplash:1518770660439-4636190af475)
*Papan sirkuit.*

## Satu statement atomik

Kesalahan paling umum: **baca hitungan, bandingkan, lalu tulis**. Dua request bersamaan sama-sama membaca `4`, sama-sama lolos, dan batas 5 menjadi 6. Solusinya, naikkan dan baca dalam **satu statement**:

```sql
INSERT INTO rate_limits (key, window_start, count)
VALUES ($1, $2, 1)
ON CONFLICT (key, window_start)
DO UPDATE SET count = rate_limits.count + 1
RETURNING count;
```

`ON CONFLICT DO UPDATE` bersifat atomik di Postgres: baris dikunci selama update, sehingga request bersamaan mendapat hitungan berurutan (4, 5, 6) dan hanya yang melewati batas ditolak.

## Middleware Gin

```go
func RateLimit(name string, limit int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !rateLimitEnabled.Load() {
			c.Next()
			return
		}
		key := fmt.Sprintf("%s:%s", name, identity(c))
		start := time.Now().UTC().Truncate(window)

		var count int
		err := db.Raw(`
			INSERT INTO rate_limits (key, window_start, count)
			VALUES (?, ?, 1)
			ON CONFLICT (key, window_start)
			DO UPDATE SET count = rate_limits.count + 1
			RETURNING count`, key, start).Scan(&count).Error
		if err != nil {
			// fail open: jangan matikan API karena limiter bermasalah
			log.Printf("rate limit: %v", err)
			c.Next()
			return
		}

		remaining := max(limit-count, 0)
		c.Header("X-RateLimit-Limit", strconv.Itoa(limit))
		c.Header("X-RateLimit-Remaining", strconv.Itoa(remaining))

		if count > limit {
			retry := int(time.Until(start.Add(window)).Seconds()) + 1
			c.Header("Retry-After", strconv.Itoa(retry))
			c.AbortWithStatusJSON(http.StatusTooManyRequests,
				gin.H{"message": "too many requests, try again later"})
			return
		}
		c.Next()
	}
}
```

Pemasangan per rute:

```go
auth.POST("/login", RateLimit("login", 5, 15*time.Minute), Login)
comments.POST("", RateLimit("comment", 20, time.Minute), CreateComment)
scrolls.POST("", RateLimit("create-scroll", 10, time.Hour), CreateScroll)
```

## Keputusan desain yang penting

**1. Siapa yang diidentifikasi?**

| Endpoint | Identitas | Alasan |
|---|---|---|
| Login | IP | Belum ada user; batasi percobaan dari satu sumber |
| Aksi terautentikasi | User ID | Adil per akun, tidak terpengaruh NAT kantor |
| Publik anonim | IP | Satu-satunya yang ada |

IP di belakang proxy: gunakan `c.ClientIP()` **dan** konfigurasikan `SetTrustedProxies` dengan benar. Kalau tidak, penyerang cukup mengirim header `X-Forwarded-For` palsu untuk menghindari batas.

**2. Fail open atau fail closed?** Kalau database limiter error, apakah request ditolak atau dilewatkan? Untuk API umum, **fail open** (lewatkan dan catat log) agar gangguan limiter tidak menjatuhkan seluruh layanan. Untuk endpoint yang sangat sensitif (reset password), pertimbangkan fail closed.

**3. Kembalikan header yang membantu.** `Retry-After` adalah standar; klien yang sopan bisa menunggu tepat sebanyak itu. Frontend KnoFo membaca header ini untuk menampilkan pesan "coba lagi dalam N detik".

**4. Bersihkan baris lama.** Tabel akan tumbuh terus. Hapus jendela kedaluwarsa secara berkala:

```sql
DELETE FROM rate_limits WHERE window_start < now() - interval '1 day';
```

Jalankan lewat cron atau goroutine dengan ticker. Index primary key `(key, window_start)` sudah membuat upsert cepat; tidak perlu index tambahan, tapi tambahkan index di `window_start` jika tabel besar dan pembersihan lambat.

## Batas pendekatan ini

Postgres sebagai penghitung bekerja baik sampai sekitar ratusan hingga beberapa ribu request/detik pada endpoint yang dibatasi. Tanda kamu perlu pindah:

- Limiter menjadi sumber beban write terbesar di database.
- Kamu butuh akurasi sliding window atau token bucket dengan burst.
- Kamu menjalankan banyak instance di banyak region dan latensi ke database terasa.
- Kamu ingin membatasi di *edge* (CDN/WAF) sebelum request menyentuh aplikasi.

Pada titik itu, Redis (`INCR` + `EXPIRE`, atau skrip Lua), atau fitur rate limiting di gateway/CDN adalah langkah berikutnya. Antarmuka middleware di atas tidak berubah; hanya isi penghitungnya.

## Mode development

Saat menguji alur login berulang kali, limiter bisa mengganggu. Kami menambahkan endpoint `/dev/rate-limit` yang hanya ada ketika `APP_ENV=development` dan hanya bisa diakses dari localhost, untuk mematikan limiter atau mereset hitungan. Di produksi, route itu **tidak terdaftar sama sekali** (404), bukan sekadar diproteksi.

## Tes

```go
func TestRateLimitBlocksAfterLimit(t *testing.T) {
	r := gin.New()
	r.GET("/x", RateLimit("test", 3, time.Minute), func(c *gin.Context) { c.Status(200) })

	codes := []int{}
	for i := 0; i < 5; i++ {
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest("GET", "/x", nil))
		codes = append(codes, w.Code)
	}
	// 200, 200, 200, 429, 429
}
```

Tambahkan juga tes konkurensi: 20 goroutine menembak sekaligus dengan batas 5; tepat 5 yang lolos.

## Ringkasan

- Fixed window + satu `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` cukup untuk banyak tim kecil.
- Jangan pernah baca-lalu-tulis; naikkan dan baca dalam satu statement atomik.
- Pilih identitas yang tepat, kembalikan `Retry-After`, dan putuskan fail open atau closed secara sadar.
- Bersihkan baris lama, dan ketahui tanda-tanda bahwa saatnya pindah ke Redis atau gateway.

Referensi: RFC 6585 (kode 429), draft IETF *RateLimit header fields for HTTP*, dan dokumentasi PostgreSQL *INSERT ... ON CONFLICT*.

<!--comments-->
komang_adi: Query upsert dengan RETURNING itu elegan sekali, Kak. Saya tadinya akan membuat SELECT lalu UPDATE dan, ternyata, itu persis kesalahan yang dibahas di sini.
sari_dewi: Itu jebakan klasik, Komang. Bagus kamu menangkapnya sebelum ke produksi.
hendrag: Kalau banyak user di kantor yang sama dengan satu IP, apakah limit login per IP tidak merugikan mereka?
sari_dewi: Betul, itu kelemahan limit per IP. Makanya aksi terautentikasi dibatasi per user ID. Untuk login, bisa tambah limit per akun (email) supaya bukan hanya IP.
raka_m: Frontend sudah membaca Retry-After dan menampilkan hitung mundur di tombol login. Terima kasih sudah menyertakan header itu, Sari.
bayu_w: Saya akan pakai pola ini untuk backend leaderboard kecil di game kita. Tidak perlu Redis dulu.
