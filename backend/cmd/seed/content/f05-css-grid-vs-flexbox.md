---
title: CSS Grid vs Flexbox: Kapan Pakai yang Mana (dengan Contoh Layout Nyata)
author: rizkymaul
category: web-frontend
difficulty: beginner
status: published
age: 76
featured: false
cover: unsplash:1498050108023-c5249f4df085
---

"Grid atau Flexbox?" adalah pertanyaan yang paling sering muncul di channel #frontend kita. Jawaban singkatnya: **Flexbox untuk satu dimensi, Grid untuk dua dimensi.** Jawaban panjangnya, yang akan kita bahas di sini, adalah cara memutuskan dengan cepat, dengan contoh layout yang benar-benar kita pakai di aplikasi: navbar, kartu scroll, dashboard, dan form.

![Laptop di meja kerja dengan editor kode](unsplash:1498050108023-c5249f4df085)
*Layout yang baik biasanya memakai keduanya: Grid untuk kerangka halaman, Flexbox untuk isi komponen.*

## Model mental

- **Flexbox** menata item sepanjang **satu sumbu** (baris *atau* kolom). Konten menentukan ukuran; kontainer mendistribusikan sisa ruang.
- **Grid** menata item di **baris dan kolom sekaligus**. Kontainer mendefinisikan *track* (kolom/baris), item ditempatkan ke dalamnya.

Cara ringkas membedakan: kalau kamu memikirkan "item-item ini berderet, lalu bagaimana sisa ruangnya?" → Flexbox. Kalau kamu memikirkan "halaman ini punya kolom dan baris tertentu" → Grid.

## Flexbox: kapan dan bagaimana

Kasus terbaik: navbar, toolbar, tombol sejajar, pusatkan sesuatu, baris tag.

```css
.navbar {
  display: flex;
  align-items: center;      /* sumbu silang (vertikal) */
  justify-content: space-between; /* sumbu utama (horizontal) */
  gap: 1rem;
}

.navbar .spacer { flex: 1 }  /* dorong item setelahnya ke kanan */
```

Tiga properti yang wajib dipahami:

| Properti | Arti |
|---|---|
| `flex-grow` | seberapa besar item boleh membesar menyerap sisa ruang |
| `flex-shrink` | seberapa besar item boleh mengecil saat ruang kurang |
| `flex-basis` | ukuran awal sebelum grow/shrink |

`flex: 1` adalah singkatan `1 1 0%`: tumbuh, menyusut, dan mulai dari nol. Itu sebabnya beberapa item ber-`flex: 1` berbagi lebar sama rata.

### Jebakan Flexbox: `min-width: auto`

Item flex tidak mau menyusut lebih kecil dari konten minimumnya. Teks panjang atau gambar bisa membuat item meluber dari kontainer. Obatnya:

```css
.card-title {
  min-width: 0;          /* izinkan menyusut */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

Ini jebakan yang paling sering bikin "teks tidak terpotong padahal sudah pakai ellipsis".

![Inspeksi elemen dan kode HTML di browser](unsplash:1517180102446-f3ece451e9d8)
*Inspeksi elemen dan kode HTML di browser.*

## Grid: kapan dan bagaimana

Kasus terbaik: kerangka halaman, galeri kartu, dashboard, form dengan label sejajar.

### Contoh 1: galeri kartu responsif tanpa media query

```css
.scroll-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}
```

Satu baris CSS. Browser membuat sebanyak mungkin kolom selebar minimal 280px; sisa ruang dibagi rata. Di layar 375px jadi 1 kolom, di 1280px jadi 4 kolom, tanpa satu pun `@media`.

`auto-fill` vs `auto-fit`: `auto-fill` mempertahankan kolom kosong, `auto-fit` meruntuhkannya sehingga item yang ada meregang. Untuk galeri dengan jumlah item sedikit, `auto-fit` biasanya yang kamu mau.

### Contoh 2: kerangka dashboard dengan area bernama

```css
.shell {
  display: grid;
  grid-template-columns: 260px 1fr;
  grid-template-rows: auto 1fr;
  grid-template-areas:
    "sidebar header"
    "sidebar main";
  min-height: 100vh;
}
.sidebar { grid-area: sidebar }
.header  { grid-area: header }
.main    { grid-area: main }

@media (max-width: 1024px) {
  .shell {
    grid-template-columns: 1fr;
    grid-template-areas: "header" "main";
  }
  .sidebar { display: none }
}
```

`grid-template-areas` membuat CSS terbaca seperti denah. Mengubah layout di mobile cukup menulis ulang denahnya.

### Contoh 3: form dengan label dan input sejajar

```css
.form-row {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 0.5rem 1rem;
  align-items: center;
}
```

Semua label sejajar rapi di kolom pertama, semua input di kolom kedua, bahkan kalau labelnya berbeda panjang. Dengan Flexbox kamu harus memberi lebar tetap pada tiap label.

## Unit `fr` dan `minmax()`

`1fr` berarti "satu bagian dari ruang sisa". Kombinasi yang paling berguna:

```css
grid-template-columns: minmax(0, 1fr) 320px;
```

`minmax(0, 1fr)` mencegah kolom fleksibel meluber karena konten panjang (sama dengan `min-width: 0` di Flexbox). Tanpa itu, `1fr` sebenarnya `minmax(auto, 1fr)`.

## Tabel keputusan

| Kebutuhan | Pilih |
|---|---|
| Navbar / toolbar / baris tombol | Flexbox |
| Memusatkan satu elemen | Flexbox (atau `place-items: center` di Grid) |
| Daftar tag yang membungkus | Flexbox + `flex-wrap` |
| Galeri kartu sama lebar | Grid |
| Kerangka halaman (sidebar + header + main) | Grid |
| Item perlu sejajar antar baris | Grid |
| Satu item membentang beberapa kolom | Grid (`grid-column: span 2`) |
| Konten menentukan ukuran, sisanya fleksibel | Flexbox |
| Layout yang tidak tahu jumlah item | Keduanya; Grid `auto-fill` sering lebih rapi |

## Berkolaborasi: Grid di luar, Flexbox di dalam

Contoh kartu scroll di KnoFo:

```css
.scroll-card {
  display: flex;          /* satu kolom vertikal */
  flex-direction: column;
  justify-content: space-between; /* footer selalu menempel ke bawah */
}
.scroll-card .meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
```

Galeri memakai Grid, tiap kartu memakai Flexbox. Dengan `justify-content: space-between`, kartu dengan judul pendek dan panjang tetap punya footer sejajar di bawah.

## Subgrid: baris yang sejajar antar kartu

Masalah klasik: tiga kartu bersebelahan, judul satu kartu dua baris, yang lain satu baris, sehingga isi di bawahnya tidak sejajar. **Subgrid** (sekarang didukung semua browser modern) membiarkan kartu memakai track milik grid induknya:

```css
.scroll-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem }
.scroll-card {
  display: grid;
  grid-row: span 3;
  grid-template-rows: subgrid; /* judul, isi, footer ikut baris induk */
}
```

## Debugging

- Chrome/Firefox DevTools punya lencana `grid` dan `flex` di panel Elements; klik untuk menampilkan garis dan nomor track.
- Kalau item tidak bergerak seperti yang diharapkan, cek dulu: apakah `display` di **induk** yang benar? Properti `justify-*`/`align-*` bekerja di kontainer, `flex-*` dan `grid-*` di item.
- `gap` menggantikan margin hack. Pakai `gap`, bukan `margin-right` pada semua kecuali anak terakhir.

## Penutup

Jangan mencari satu pemenang. Mulai dari pertanyaan "satu dimensi atau dua?". Jika ragu, coba Grid untuk kerangka dan Flexbox untuk isi. Kebanyakan layout rumit yang saya lihat adalah campuran keduanya, dan hampir semua hack margin negatif bisa dihapus setelah pakai `gap`.

Referensi: MDN Web Docs (*CSS Grid Layout*, *Flexbox*, *Subgrid*) dan *A Complete Guide to Grid* di CSS-Tricks.

<!--comments-->
raka_m: Tabel keputusannya praktis, Rizky. Saya tambahkan satu: kalau kamu menulis `margin: auto` untuk memusatkan di Flexbox, itu sering bisa diganti `place-items: center` di Grid. Dua baris, tanpa hack.
rizkymaul: Betul Kak, saya tambahkan di revisi berikutnya. Saya juga lupa bahas container query, nanti mungkin scroll terpisah.
putriayu: Contoh form dengan label sejajar menolong sekali. Handoff desain saya selalu mengasumsikan label sejajar tapi developer sering membuatnya dengan lebar tetap.
dewilestari: Min-width 0 di Flexbox itu penyelamat. Saya habiskan dua jam kemarin karena judul kartu tidak mau terpotong.
citraang: Subgrid ini baru buat saya! Apakah aman dipakai di semua browser yang kita dukung?
raka_m: Untuk browser modern aman sejak 2023. Kita cek tabel dukungan browser tim dulu, tapi untuk aplikasi internal tidak ada masalah.
