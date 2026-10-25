---
title: Auto Layout dan Variants di Figma: Membangun Komponen yang Tahan Banting
author: maya_kusuma
category: design-ui
difficulty: intermediate
status: published
age: 50
featured: false
cover: unsplash:1586717791821-3f44a563fa4c
---

Ada dua jenis file komponen di Figma. Jenis pertama: tombol dengan lebar tetap 120 px yang rusak begitu labelnya diganti "Simpan perubahan". Jenis kedua: tombol yang melebar mengikuti teksnya, punya varian ukuran dan status, dan dapat dipakai tanpa dipecah (*detach*) oleh siapa pun di tim. Perbedaan keduanya hampir selalu dua fitur: **Auto Layout** dan **Variants**.

Scroll ini adalah panduan yang saya pakai untuk melatih desainer baru di Palm Studio. Targetnya satu: setelah selesai, kamu bisa membangun tombol, kartu, dan input yang responsif terhadap isi dan konsisten dengan kode.

![Tablet dengan wireframe antarmuka dan stylus](unsplash:1586717791821-3f44a563fa4c)
*Komponen yang baik berperilaku seperti CSS: ia menyesuaikan diri dengan isi dan konteksnya.*

## Auto Layout adalah flexbox di Figma

Auto Layout (`Shift + A`) membuat frame menata anak-anaknya otomatis, sama seperti `display: flex`.

| Pengaturan Figma | Padanan CSS |
|---|---|
| Direction: Horizontal / Vertical | `flex-direction: row / column` |
| Gap between items | `gap` |
| Padding | `padding` |
| Alignment (9 titik) | `justify-content` + `align-items` |
| Hug contents | `width: fit-content` |
| Fill container | `flex: 1` / `width: 100%` |
| Fixed | `width: 120px` |
| Wrap | `flex-wrap: wrap` |

Pemahaman paling penting: **resizing mode** setiap elemen.

- **Hug**: ukuran mengikuti isi. Cocok untuk tombol dan chip.
- **Fill**: mengisi sisa ruang induk. Cocok untuk kolom teks dan input.
- **Fixed**: ukuran tetap. Gunakan hanya bila memang tetap (ikon, avatar).

Satu kesalahan klasik: semua anak diatur *Fixed*, sehingga Auto Layout tidak melakukan apa-apa. Biarkan induk `Hug` dan anak `Fill` atau `Hug`.

### Contoh: tombol

1. Buat teks "Simpan", pilih, tekan `Shift + A`.
2. Setel Padding: horizontal 16, vertical 10. Alignment tengah.
3. Isi warna dari variabel `color.action.primary` dan radius dari `radius.md` (lihat scroll *Design Token*).
4. Lebar frame: **Hug contents**. Ganti teks menjadi "Simpan perubahan"; tombol melebar otomatis.

### Auto Layout bersarang

Hampir semua komponen nyata adalah Auto Layout di dalam Auto Layout:

```
Card (vertical, gap 12, padding 20)
├── Cover (fill width, aspect 16:9)
├── Body (vertical, gap 8)
│   ├── Title  (fill width)
│   └── Excerpt (fill width)
└── Footer (horizontal, gap 8, space-between)
    ├── Author (horizontal, gap 8): Avatar + Name
    └── Stats  (horizontal, gap 12): Likes + Bookmarks
```

Setiap lapisan punya satu tanggung jawab tata letak. Jika bingung, tanya: "ini baris atau kolom?"

## Constraints dan Absolute Position

Elemen yang harus keluar dari aliran Auto Layout (lencana di sudut kartu, tombol tutup) memakai **Absolute position** (ikon di panel Auto Layout), lalu atur *constraints* (kanan atas) seperti `position: absolute` di CSS.

![Palet warna dan swatch](unsplash:1561070791-2526d30994b5)
*Palet warna dan swatch.*

## Variants: satu komponen, banyak keadaan

Variants menggabungkan beberapa versi komponen dalam satu *component set*, dikontrol oleh **properties**.

| Tipe property | Contoh | Padanan kode |
|---|---|---|
| **Variant** (pilihan) | `size = sm / md / lg`; `state = default / hover / pressed / disabled` | prop enum |
| **Boolean** | `hasIcon = true/false` | prop boolean |
| **Text** | `label = "Simpan"` | prop string / children |
| **Instance swap** | `icon = <Icon>` | prop komponen |

Struktur tombol yang kami pakai:

- `variant`: primary, secondary, ghost, danger
- `size`: sm, md, lg
- `state`: default, hover, pressed, focus, disabled
- `leftIcon` (boolean + instance swap)
- `label` (text)

Kombinasi variant = 4 × 3 × 5 = 60. Jangan menggambar 60 secara manual: buat satu varian dasar, lalu **duplikat variant dan ubah properti**, dan gunakan variabel untuk warna sehingga perbedaan state hanyalah alias token berbeda.

### Penamaan properti = nama prop di kode

Gunakan nama dan nilai yang sama dengan komponen React: `variant="primary"`, `size="md"`, `disabled`. Developer bisa menyalin langsung ke JSX, dan Dev Mode di Figma menampilkannya persis.

## Menghindari komponen yang rapuh

Tabel pemeriksaan yang saya pakai saat review file:

| Gejala | Penyebab | Perbaikan |
|---|---|---|
| Teks terpotong saat diganti | Lebar Fixed | Hug / Fill + min-width |
| Ikon bergeser | Elemen bukan di Auto Layout | Bungkus dalam frame Auto Layout |
| Ruang kosong di bawah kartu | Tinggi Fixed | Hug |
| Konten panjang meluap | Tidak ada batas | Maks lebar + *Truncate text* |
| Developer men-*detach* komponen | Variasi yang dibutuhkan tidak ada | Tambah property; tanyakan alasan detach |
| Warna per variant ditulis hex | Tidak memakai variabel | Ganti ke variabel semantik |
| 120 komponen hampir sama | Tidak memakai variants | Gabungkan dalam component set |

**Min/Max width**: Auto Layout mendukung *min* dan *max* width/height. Berguna untuk tombol (min 80) dan kartu (max 560), sama seperti CSS `min-width`/`max-width`.

## Responsif: frame, bukan hanya komponen

Auto Layout juga membuat halaman responsif:

- Bungkus konten halaman dalam frame Auto Layout vertikal, lebar **Fill**.
- Grid kartu memakai Auto Layout horizontal dengan **Wrap**; lebar tiap kartu *Fixed* min-lebar (misal 280) agar baris pecah seperti `auto-fill`.
- Uji dengan *resize* frame ke 375, 768, dan 1280 untuk melihat perilakunya sebelum diserahkan.
- Gunakan **Layout Grid** untuk kolom 12-kolom sebagai panduan, tapi ingat kode memakai CSS Grid nyata.

Hubungannya dengan container query (lihat scroll Putri): komponen kartu di Figma bisa memiliki variant `size = compact / wide`, dan catatannya menyebut lebar kontainer, bukan lebar layar.

## Handoff yang rapi

1. **Penamaan layer**: `Card / Footer / Author`, bukan `Frame 1203`.
2. **Dev Mode**: pastikan properti, variabel, dan Auto Layout tampil benar. Developer mengambil jarak dan warna dari token, bukan menyalin pixel.
3. **Dokumentasi di deskripsi komponen**: kapan dipakai, kapan tidak, perilaku responsif.
4. **Keadaan semua**: hover, focus, disabled, loading, error, kosong (bukan hanya "happy path").
5. **Anotasi interaksi**: transisi (durasi dan easing) memakai token gerak.

## Alur membangun komponen baru

1. Tentukan anatomi (bagian apa saja) dan kebutuhan dari kode: props apa yang dibutuhkan developer?
2. Bangun elemen terkecil dengan Auto Layout, tanpa warna hardcode.
3. Tambahkan variants untuk state dan ukuran; beri nama properti sesuai kode.
4. Tambahkan boolean dan instance swap untuk bagian opsional.
5. Uji dengan isi ekstrem: teks sangat panjang, sangat pendek, tanpa ikon, dengan dua ikon.
6. Publikasikan ke library dan tulis deskripsi.

## Penutup

Komponen yang kokoh di Figma tidak lahir dari menggambar teliti, tetapi dari **menyatakan aturan**: bagaimana ia tumbuh, apa saja yang bisa diubah, dan bagaimana ia berperilaku di setiap kondisi. Itu bahasa yang sama dengan yang dipakai developer, dan itu alasan Auto Layout membuat kolaborasi lebih mudah.

Referensi: Figma Help Center (*Auto layout*, *Component properties*, *Variants*) dan *Design Systems Handbook* oleh DesignBetter.

<!--comments-->
putriayu: Tabel pemeriksaan di tengah scroll ini yang paling saya pakai. Saya baru sadar kenapa tombol saya selalu kehilangan padding saat teks diganti: framenya Fixed.
maya_kusuma: Itu paling sering, Putri. Hug di induk, Fill atau Hug di anak. Hampir selalu itu jawabannya.
salsa_nur: Aturan penamaan property sama dengan prop React sangat menolong. Dev Mode jadi jelas.
raka_m: Dari kami, itu menghemat banyak diskusi. Kalau Figma menulis variant=primary, kami tahu persis prop-nya.
citraang: Saya baru bergabung dan belum pernah memakai component properties. Boleh ada sesi singkat untuk membahas boolean dan instance swap?
maya_kusuma: Tentu, Citra. Kita adakan Kamis sore, 30 menit.
dewilestari: Sebagai developer, saya menghargai lampiran 'isi ekstrem'. Teks panjang adalah penyebab bug UI nomor satu.
