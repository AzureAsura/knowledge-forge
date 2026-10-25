---
title: Pagination di API: Offset vs Cursor, dan Kenapa Halaman 500 Terasa Lambat
author: komang_adi
category: web-backend
difficulty: intermediate
status: published
age: 66
featured: false
cover: unsplash:1558494949-ef010cbdcc31
---

Saya baru dua bulan belajar backend, dan kemarin saya menemukan sesuatu yang membuat saya terdiam: endpoint daftar scroll cepat di halaman 1, tapi di halaman 500 butuh hampir satu detik. Datanya sama, query-nya sama, hanya angka `page` yang berbeda.

Setelah bertanya ke Kak Sari dan membaca banyak, saya paham masalahnya, dan ternyata ini salah satu keputusan desain API yang paling sering diremehkan. Scroll ini adalah catatan belajar saya tentang **offset pagination vs cursor pagination**, lengkap dengan percobaan yang saya jalankan sendiri.

![Rak server dengan kabel](unsplash:1558494949-ef010cbdcc31)
*Database harus tetap membaca baris yang dilewati. Itulah biaya tersembunyi dari OFFSET.*

## Offset pagination: yang paling umum

Cara paling sederhana: klien mengirim `page` dan `limit`; server menghitung `OFFSET = (page - 1) * limit`.

```sql
SELECT id, title, created_at
FROM scrolls
WHERE status = 'published'
ORDER BY created_at DESC
LIMIT 20 OFFSET 9980;   -- halaman 500
```

Keunggulan: sederhana, bisa lompat ke halaman mana saja, mudah menampilkan "Halaman 3 dari 40". Dan untuk tabel kecil, ia sempurna. Di KnoFo kami memakainya untuk daftar scroll karena data masih ribuan.

## Masalah 1: lambat di halaman dalam

`OFFSET 9980` **tidak** melompat langsung ke baris ke-9981. Database tetap menghasilkan 9.980 baris pertama lalu membuangnya, baru mengambil 20 baris berikutnya. Biayanya naik linier terhadap offset.

Saya mengujinya dengan 1 juta baris (`EXPLAIN ANALYZE`):

| Halaman | OFFSET | Waktu |
|---|---|---|
| 1 | 0 | 0,6 ms |
| 100 | 1.980 | 3 ms |
| 5.000 | 99.980 | 38 ms |
| 50.000 | 999.980 | 410 ms |

Tidak ada pengguna yang menekan halaman 50.000 secara manual, tapi **bot scraper** dan fitur "lompat ke halaman terakhir" melakukannya. Satu endpoint yang lambat di halaman dalam bisa dipakai untuk membebani database.

![Pengembang bekerja di lingkungan gelap dengan banyak layar](unsplash:1510915228340-29c85a43dcfe)
*Pengembang bekerja di lingkungan gelap dengan banyak layar.*

## Masalah 2: baris bergeser (duplikat dan terlewat)

Bayangkan kamu di halaman 1 (item 1–20). Saat kamu membaca, ada dua scroll baru dipublikasikan. Item lama bergeser ke bawah. Ketika kamu menekan halaman 2 (OFFSET 20), dua item yang tadi ada di posisi 19–20 muncul lagi sebagai posisi 21–22: **duplikat**. Kebalikannya, kalau ada item dihapus, satu item **terlewat** tanpa pernah terlihat.

Untuk feed yang aktif, ini bukan teori. Ini terjadi tiap hari.

## Cursor pagination (keyset)

Alih-alih "lewati N baris", katakan "beri aku 20 baris **setelah** baris ini". Klien mengirim *cursor* yang menunjuk posisi terakhir yang ia lihat.

```sql
-- halaman pertama
SELECT id, title, created_at
FROM scrolls
WHERE status = 'published'
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- halaman berikutnya, cursor = (created_at, id) dari baris terakhir
SELECT id, title, created_at
FROM scrolls
WHERE status = 'published'
  AND (created_at, id) < ('2026-03-01 10:15:00+07', 4821)
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

Perhatikan dua hal penting:

1. **Tie-breaker `id`.** `created_at` bisa sama untuk beberapa baris. Tanpa kolom unik sebagai penentu akhir, urutan tidak deterministik dan baris bisa terlewat atau duplikat. Kunci urut harus **unik**.
2. **Perbandingan baris** `(created_at, id) < (..., ...)` didukung Postgres dan bisa memakai index composite.

Dengan index `(created_at DESC, id DESC)` yang sesuai, query ini memakai index scan dan membaca tepat 20 baris, berapa pun "kedalamannya":

| Posisi | Waktu |
|---|---|
| Item ke-20 | 0,4 ms |
| Item ke-1.000.000 | 0,5 ms |

Stabil, dan tidak ada duplikat saat data bertambah di bagian atas, karena posisi diikat ke nilai, bukan ke nomor urut.

## Merepresentasikan cursor

Cursor sebaiknya **opak** bagi klien: string yang ia teruskan apa adanya.

```go
type cursor struct {
	CreatedAt time.Time `json:"c"`
	ID        uint      `json:"i"`
}

func encodeCursor(c cursor) string {
	b, _ := json.Marshal(c)
	return base64.RawURLEncoding.EncodeToString(b)
}

func decodeCursor(s string) (cursor, error) {
	var c cursor
	b, err := base64.RawURLEncoding.DecodeString(s)
	if err != nil {
		return c, err
	}
	return c, json.Unmarshal(b, &c)
}
```

Respons API:

```json
{
  "data": [ ... 20 item ... ],
  "next_cursor": "eyJjIjoiMjAyNi0wMy0wMVQxMDoxNTowMFoiLCJpIjo0ODIxfQ",
  "has_more": true
}
```

Mengambil `limit + 1` baris lalu membuang yang terakhir adalah trik murah untuk mengetahui `has_more` tanpa `COUNT(*)` yang mahal.

Validasi cursor seperti input pengguna lain: cursor yang rusak harus menghasilkan `400`, bukan panic. Kalau kamu khawatir klien mengutak-atik, tanda tangani dengan HMAC; tapi biasanya cukup validasi tipe, karena cursor hanya mempersempit data yang memang boleh dilihat.

## Kekurangan cursor

- **Tidak bisa lompat ke halaman N.** Hanya "berikutnya" dan (dengan cursor kebalikan) "sebelumnya".
- **Tidak ada total halaman** tanpa query `COUNT` tambahan.
- **Urutan harus berdasarkan kolom yang ber-index dan unik** (atau digabung dengan id). Urut dinamis berdasarkan banyak kolom kustom jadi rumit.
- Sedikit lebih sulit dibuat dan diuji.

## Tabel perbandingan

| | Offset | Cursor |
|---|---|---|
| Lompat ke halaman tertentu | ✅ | ❌ |
| Total halaman | ✅ (dengan COUNT) | ❌ / perkiraan |
| Performa halaman dalam | ❌ linier | ✅ konstan |
| Stabil saat data berubah | ❌ duplikat/terlewat | ✅ |
| Kompleksitas | Rendah | Sedang |
| Cocok untuk | Admin table, data kecil, UI bernomor halaman | Feed, infinite scroll, API publik, data besar |

## Jalan tengah di KnoFo

Daftar scroll di KnoFo memakai **offset** karena UI-nya bernomor halaman dan datanya masih kecil, tapi dengan beberapa pengaman:

- `limit` dibatasi (maksimum 50) di server agar klien tidak meminta 10.000 baris.
- Urutan selalu menyertakan `id` sebagai tie-breaker supaya hasil deterministik.
- Kolom yang boleh diurutkan di-whitelist (`created_at`, `likes_count`, `view_count`), bukan diteruskan mentah dari query string, untuk menghindari SQL injection lewat `ORDER BY`.
- Komentar memakai pola yang sama, dan akan kami pindahkan ke cursor kalau satu scroll menembus ribuan komentar.

```go
var sortColumns = map[string]string{
	"created_at":  "created_at",
	"likes_count": "likes_count",
	"view_count":  "view_count",
}

func orderClause(col, dir string) string {
	column, ok := sortColumns[col]
	if !ok {
		column = "created_at"
	}
	if dir != "asc" {
		dir = "desc"
	}
	return column + " " + dir + ", id " + dir
}
```

## Kapan beralih ke cursor?

Beberapa sinyal bahwa saatnya:

1. Waktu query naik di halaman dalam (cek `EXPLAIN ANALYZE` di offset besar).
2. UI berubah menjadi infinite scroll.
3. Feed sering bertambah item baru sehingga pengguna mengeluh melihat item yang sama dua kali.
4. API dibuka untuk pihak ketiga.

## Yang saya pelajari

- `OFFSET` tidak melompat; ia membaca lalu membuang.
- Cursor mengikat posisi ke nilai, bukan nomor urut, sehingga cepat dan stabil.
- Kunci urut cursor harus unik: tambahkan `id`.
- Whitelist kolom `ORDER BY` dan batasi `limit`, dua pengaman murah yang sering terlupa.

Terima kasih Kak Sari yang memeriksa query dan tabel waktunya.

<!--comments-->
sari_dewi: Bagus sekali eksperimennya, Komang, terutama tabel waktu di halaman dalam. Satu catatan: waktu di tabelmu bergantung pada cache; jalankan dua kali dan catat yang kedua juga supaya adil.
komang_adi: Siap Kak, saya ulang dengan cache dingin dan hangat dan perbarui tabelnya.
raka_m: Dari frontend, cursor cocok sekali dengan useInfiniteQuery. getNextPageParam tinggal mengembalikan next_cursor. Dengan offset, kita harus menghitung sendiri kapan berhenti.
rizkymaul: Pertanyaan: kalau pengguna ingin mengurutkan berdasarkan likes_count, cursor-nya bagaimana? Kolomnya tidak unik.
sari_dewi: Pakai pasangan (likes_count, id) sebagai kunci. Cursor menyimpan dua nilai itu. Index composite harus sesuai urutannya.
hendrag: Saya baru tahu trik limit + 1 untuk has_more. Jauh lebih murah daripada COUNT.
dewilestari: Catatan tentang whitelist ORDER BY penting sekali. Saya hampir menulis `ORDER BY ` + r.URL.Query().Get("sort") di tugas kemarin.
