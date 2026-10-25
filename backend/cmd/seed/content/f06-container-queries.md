---
title: Dari Figma ke CSS: Container Queries untuk Komponen yang Benar-Benar Responsif
author: putriayu
category: web-frontend
difficulty: beginner
status: published
age: 13
featured: false
cover: unsplash:1572044162444-ad60f128bdea
---

Sebagai desainer, saya sering membuat satu komponen kartu di Figma dengan dua varian: *compact* untuk sidebar dan *wide* untuk halaman utama. Lalu saat handoff, developer bertanya: "Kartu ini berubah di breakpoint berapa?" Dan saya bingung menjawab, karena perubahannya sebenarnya tidak tergantung lebar layar, tapi **lebar tempat kartu itu ditaruh**.

Itu persis masalah yang diselesaikan oleh **CSS Container Queries**. Scroll ini saya tulis supaya desainer dan developer punya bahasa yang sama. Saya tidak jago kode, jadi tolong koreksi bagian CSS-nya kalau ada yang kurang pas.

![Tablet dan keyboard, workflow desain ke kode](unsplash:1572044162444-ad60f128bdea)
*Komponen yang sama bisa hidup di tempat yang lebarnya berbeda-beda. Medianya adalah kontainer, bukan layar.*

## Masalah dengan media query

`@media (min-width: 768px)` bertanya: "seberapa lebar **viewport**?". Padahal kartu yang ditaruh di sidebar sempit pada layar 1440px tetap dianggap "layar lebar", jadi ia memakai layout lebar dan terjepit.

Solusi lama: buat kelas variasi (`.card--compact`) lalu pasang manual. Solusi baru: biarkan komponen **bertanya pada kontainernya sendiri**.

## Sintaks dasar

Dua langkah. Pertama, tandai elemen induk sebagai *container*. Kedua, tulis aturan `@container`.

```css
.card-wrapper {
  container-type: inline-size;  /* lacak lebar (inline axis) */
  container-name: card;          /* opsional, tapi memperjelas */
}

.card {
  display: grid;
  gap: 0.75rem;
}

@container card (min-width: 420px) {
  .card {
    grid-template-columns: 160px 1fr;  /* gambar di kiri, teks di kanan */
    align-items: center;
  }
}
```

Perhatikan: aturan `@container` memengaruhi **anak** dari kontainer, bukan kontainer itu sendiri. Itu sebabnya perlu `.card-wrapper` di luar `.card`.

Singkatan: `container: card / inline-size;`.

![Inspeksi elemen dan kode HTML di browser](unsplash:1517180102446-f3ece451e9d8)
*Inspeksi elemen dan kode HTML di browser.*

## Contoh: kartu scroll yang beradaptasi

Di sidebar (lebar 280px) kartu menampilkan judul dan satu baris meta. Di grid utama (lebar 420px+) kartu menampilkan gambar di samping teks, dan di lebar 640px+ ia menampilkan ringkasan.

```css
.scroll-card { container: scroll-card / inline-size }

.scroll-card__inner { display: grid; gap: .5rem }
.scroll-card__excerpt { display: none }

@container scroll-card (min-width: 420px) {
  .scroll-card__inner { grid-template-columns: 140px 1fr }
}

@container scroll-card (min-width: 640px) {
  .scroll-card__excerpt { display: block }
  .scroll-card__title { font-size: 1.25rem }
}
```

Di Figma, ini sama dengan satu komponen dengan *variant property* `size = compact | medium | wide`. Developer sekarang bisa menerjemahkan variant itu langsung ke breakpoint kontainer, bukan ke breakpoint layar.

## Menyamakan bahasa Figma dan CSS

| Di Figma | Di CSS |
|---|---|
| Component + Variants | satu komponen + `@container` |
| Auto Layout (direction: horizontal/vertical) | `flex-direction` / `grid-template-columns` |
| Min/Max width | `min-width` / `max-width` di `@container` |
| Frame constraints | ukuran kontainer pembungkus |

Saran saya untuk sesama desainer: saat membuat varian, **tuliskan lebar kontainernya**, bukan lebar layar. Contoh catatan di Figma: *"Compact: kontainer < 420 px; Wide: kontainer ≥ 420 px"*. Developer langsung tahu angka yang dipakai di `@container`.

## Unit kontainer

Selain query, ada unit `cqw`, `cqh`, `cqi` yang relatif terhadap ukuran kontainer:

```css
.scroll-card__title {
  font-size: clamp(1rem, 4cqi, 1.5rem); /* 4% dari lebar kontainer */
}
```

Teks ikut mengecil di kontainer sempit tanpa media query sama sekali.

## Kapan tetap pakai media query

- Perubahan **layout halaman**: sidebar muncul atau hilang, jumlah kolom utama.
- Preferensi pengguna: `prefers-reduced-motion`, `prefers-color-scheme`, `hover: none`.
- Cetak (`@media print`).

Aturan praktis yang saya pegang: **media query untuk halaman, container query untuk komponen.**

## Hal yang perlu hati-hati

1. **Kontainer tidak boleh menentukan ukurannya dari anaknya.** `container-type: inline-size` membuat kontainer tidak menghitung lebar dari konten, jadi pastikan ia punya lebar dari luar (grid, flex, atau width). Kalau kontainernya "collapse" jadi nol, itu penyebabnya.
2. **Jangan menumpuk terlalu banyak kontainer.** Debug jadi sulit; mulai dari satu level.
3. **Cek dukungan browser** tim Anda. Container query sudah didukung browser modern sejak 2023.
4. Beri `container-name` supaya aturan tidak menarget kontainer terdekat yang salah.

## Alur kerja yang kami sepakati di Palm Studio

1. Desainer membuat komponen dengan variant `compact/wide` dan menulis lebar kontainer di deskripsi komponen.
2. Developer membungkus komponen dengan `container-type: inline-size`.
3. Breakpoint ditulis sebagai variabel (`--cq-md: 420px`) di dokumentasi supaya Figma dan CSS memakai angka yang sama (lihat scroll *Design Token* oleh Kak Maya).
4. Review bersama di Storybook dengan mengubah lebar kontainer, bukan lebar jendela.

## Ringkasan

- `@media` bertanya tentang viewport; `@container` bertanya tentang tempat komponen berada.
- Tandai induk dengan `container-type: inline-size`, lalu tulis `@container` untuk anak-anaknya.
- Desainer sebaiknya menulis lebar kontainer pada varian komponen.
- Pakai media query untuk halaman, container query untuk komponen.

Referensi: MDN (*CSS container queries*) dan artikel *Container Queries Unleashed* oleh Josh Comeau.

<!--comments-->
maya_kusuma: Tulisan pertama yang bagus, Putri. Catatan "tuliskan lebar kontainer di varian" itu sederhana tapi hilang di hampir semua file desain yang pernah saya lihat. Saya masukkan ke checklist komponen.
putriayu: Terima kasih Kak Maya! Saya nanti coba buat template deskripsi komponen supaya kolomnya selalu ada.
raka_m: Dari sisi frontend, satu hal: `container-type: inline-size` membuat elemen itu punya containment. Kadang efek sampingnya terlihat di posisi absolut anak. Tidak sering, tapi kalau ada bug aneh, cek itu dulu.
dewilestari: Unit cqi untuk font-size baru buat saya. Boleh dicoba di kartu profil, ya.
salsa_nur: Setuju dengan aturan "media query untuk halaman, container query untuk komponen". Mudah diingat dan mudah dijelaskan ke tim.
