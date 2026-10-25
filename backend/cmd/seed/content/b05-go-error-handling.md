---
title: Error Handling di Go yang Rapi: Wrapping, errors.Is/As, dan Sentinel Error
author: rizkymaul
category: web-backend
difficulty: beginner
status: published
age: 35
featured: false
cover: unsplash:1518770660439-4636190af475
---

Orang yang baru pindah ke Go sering mengeluh: "kenapa `if err != nil` di mana-mana?" Saya dulu begitu. Setelah menulis beberapa service, saya berubah pikiran: pengulangan itu **disengaja**. Error adalah nilai biasa, dan Go memaksa kita memutuskan, di setiap titik, apa yang dilakukan terhadapnya.

Yang sebenarnya jadi masalah bukan `if err != nil`, melainkan *apa yang kita taruh di dalam blok itu*. Scroll ini membahas lima kebiasaan yang membuat error handling Go terbaca dan bisa di-debug: menambahkan konteks, membedakan error dengan `errors.Is`, mengambil detail dengan `errors.As`, memakai sentinel error, dan memetakan error ke respons HTTP.

![Papan sirkuit dengan komponen elektronik](unsplash:1518770660439-4636190af475)
*Error yang baik membawa jalur: apa yang sedang dikerjakan ketika gagal.*

## Kebiasaan 1: jangan hanya `return err`

```go
func GetScroll(id uint) (*Scroll, error) {
	var s Scroll
	if err := db.First(&s, id).Error; err != nil {
		return nil, err // ❌ pesan akhirnya: "record not found"
	}
	return &s, nil
}
```

Saat error ini muncul di log tiga lapis di atas, "record not found" tidak memberi tahu: record apa? Dalam operasi apa? Tambahkan konteks dengan `%w`:

```go
if err := db.First(&s, id).Error; err != nil {
	return nil, fmt.Errorf("get scroll %d: %w", id, err)
}
```

Sekarang pesannya: `approve scroll: get scroll 42: record not found`. Setiap lapis menambahkan satu frasa, dan jejaknya terbaca dari kiri ke kanan seperti kalimat.

Aturan frasa: tulis **apa yang sedang dilakukan**, huruf kecil, tanpa titik, dan tanpa kata "failed to" yang mengulang (kalau tiap lapis menulis "failed to", log berisi lima "failed to" berturut-turut).

### `%w` vs `%v`

- `%w` **membungkus**: error asli tetap bisa diperiksa dengan `errors.Is`/`errors.As`.
- `%v` hanya mengambil teksnya: rantai putus.

Kalau kamu sengaja menyembunyikan detail internal dari pemanggil (misalnya agar paket lain tidak bergantung pada tipe database), pakai `%v`. Selain itu, `%w`.

## Kebiasaan 2: sentinel error untuk kondisi yang dikenali

Sentinel error adalah variabel error di level paket yang mewakili kondisi tertentu:

```go
var (
	ErrScrollNotFound   = errors.New("scroll not found")
	ErrScrollNotPending = errors.New("scroll is not pending review")
	ErrForbidden        = errors.New("forbidden")
)
```

Gunakan di service:

```go
func approveScroll(callerID uint, id uint) error {
	var s model.Scroll
	if err := db.First(&s, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrScrollNotFound
		}
		return fmt.Errorf("approve scroll %d: %w", id, err)
	}
	if s.Status != model.ScrollStatusPending {
		return ErrScrollNotPending
	}
	if s.AuthorID == callerID {
		return fmt.Errorf("approve scroll %d: %w", id, ErrForbidden)
	}
	// ...
	return nil
}
```

Dan di pemanggil, bandingkan dengan **`errors.Is`**, bukan `==`:

```go
if err := approveScroll(uid, id); err != nil {
	switch {
	case errors.Is(err, ErrScrollNotFound):
		c.JSON(404, gin.H{"message": err.Error()})
	case errors.Is(err, ErrScrollNotPending):
		c.JSON(409, gin.H{"message": err.Error()})
	case errors.Is(err, ErrForbidden):
		c.JSON(403, gin.H{"message": "not allowed"})
	default:
		log.Printf("approve scroll: %v", err)
		c.JSON(500, gin.H{"message": "internal error"})
	}
	return
}
```

`errors.Is` menelusuri rantai pembungkus, jadi `fmt.Errorf("...: %w", ErrForbidden)` tetap cocok. Dengan `==`, versi yang dibungkus tidak akan cocok.

![Pengembang bekerja di lingkungan gelap dengan banyak layar](unsplash:1510915228340-29c85a43dcfe)
*Pengembang bekerja di lingkungan gelap dengan banyak layar.*

## Kebiasaan 3: tipe error khusus + `errors.As`

Kadang kita butuh **data** di dalam error, bukan sekadar identitas.

```go
type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	return fmt.Sprintf("invalid %s: %s", e.Field, e.Message)
}
```

Pemanggil mengambilnya dengan `errors.As`:

```go
var ve *ValidationError
if errors.As(err, &ve) {
	c.JSON(422, gin.H{"field": ve.Field, "message": ve.Message})
	return
}
```

Perhatikan `&ve` adalah pointer ke variabel bertipe `*ValidationError`. Kesalahan umum pemula: lupa `&`, atau salah tipe sehingga `errors.As` panic/selalu false.

## Kebiasaan 4: tangani error **sekali**

Jangan *log lalu return*:

```go
if err != nil {
	log.Printf("save failed: %v", err) // ❌ dilog di sini...
	return err                          // ...lalu dilog lagi oleh pemanggil
}
```

Hasilnya, satu kegagalan muncul lima kali di log dengan konteks berbeda. Aturan yang saya pegang: **setiap error dilog atau dikembalikan, tidak keduanya.** Lapisan paling luar (handler HTTP, `main`, worker) yang melog. Lapisan dalam hanya membungkus dan mengembalikan.

Pengecualian: error yang sengaja diabaikan, misalnya kegagalan memberi XP tambahan yang tidak boleh menggagalkan aksi utama. Di situ boleh dilog dan dilanjutkan, tapi tulis alasan di komentar.

## Kebiasaan 5: jangan mengabaikan error tanpa alasan

```go
defer rows.Close()           // ok, umumnya diabaikan
json.NewEncoder(w).Encode(v) // ❌ mengabaikan error tulis
f, _ := os.Open(path)        // ❌ f bisa nil
```

Linter seperti `errcheck` (sudah ada di `golangci-lint`) menangkap ini. Kalau kamu memang mengabaikan, buat eksplisit: `_ = f.Close()` dengan komentar.

## `errors.Join` dan beberapa error

Sejak Go 1.20 ada `errors.Join` untuk menggabungkan beberapa error, berguna saat membersihkan banyak resource:

```go
func closeAll(cs ...io.Closer) error {
	var errs []error
	for _, c := range cs {
		errs = append(errs, c.Close())
	}
	return errors.Join(errs...) // nil kalau semua nil
}
```

`errors.Is` dan `errors.As` bekerja juga pada hasil `Join`.

## `panic` dan `recover`

`panic` bukan untuk alur normal. Gunakan untuk kondisi yang *tidak mungkin* terjadi (bug pemrogram) atau kegagalan saat start-up (konfigurasi wajib hilang). Gin sudah memasang middleware `Recovery()` yang menangkap panic di handler agar server tidak mati; jangan mengandalkannya sebagai pengganti error handling.

## Ringkasan praktis

| Situasi | Lakukan |
|---|---|
| Error dari bawah, tambah konteks | `fmt.Errorf("aksi: %w", err)` |
| Kondisi yang dikenali pemanggil | Sentinel `var ErrX = errors.New(...)` + `errors.Is` |
| Butuh data dalam error | Tipe khusus + `errors.As` |
| Di handler HTTP | Peta error → status code, log error tak dikenal sebagai 500 |
| Banyak error sekaligus | `errors.Join` |
| Sudah dilog | Jangan dikembalikan juga |

## Latihan

Ambil satu handler di proyekmu, lalu: (1) cari semua `return err` polos dan tambahkan konteks, (2) ganti perbandingan `err == ErrX` dengan `errors.Is`, (3) buat tabel pemetaan error ke status HTTP di satu tempat. Kamu akan kaget betapa jelas log-nya setelah itu.

Referensi: *Working with Errors in Go 1.13* (blog Go) dan dokumentasi paket `errors`.

<!--comments-->
sari_dewi: Ringkas dan benar, Rizky. Satu tambahan dari pengalaman: jangan bocorkan pesan error internal (SQL, path file) ke klien. Tampilkan pesan generik di 500 dan simpan detail di log dengan request id.
rizkymaul: Setuju Kak, belum saya tulis di scroll. Saya tambahkan di revisi: respons 500 selalu generik.
komang_adi: Kebiasaan 4 itu yang saya langgar tiap hari. Sekarang saya paham kenapa satu error muncul empat kali di log.
hendrag: Apa bedanya errors.As dengan type assertion biasa? Saya biasa menulis err.(*ValidationError).
rizkymaul: Type assertion hanya memeriksa lapisan paling luar. Kalau error itu dibungkus dengan %w, assertion gagal tapi errors.As tetap menemukannya.
dewilestari: Meski saya frontend, bagian peta error ke status code membantu saya mengerti kenapa API kadang 409 dan kadang 422.
