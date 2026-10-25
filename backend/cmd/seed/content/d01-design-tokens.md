---
title: Design Token: Satu Sumber Kebenaran untuk Desain dan Kode
author: maya_kusuma
category: design-ui
difficulty: intermediate
status: published
age: 105
featured: true
cover: unsplash:1561070791-2526d30994b5
---

Setiap tim produk pernah mengalami percakapan ini: "Biru di tombol ini kok beda dengan biru di header?" Desainer mengecek Figma: `#3B82F6`. Developer mengecek kode: `#3b83f7`, hasil copy-paste dari screenshot tiga bulan lalu. Selisihnya satu digit, tidak ada yang melihatnya, sampai klien melihat dua biru bersebelahan.

**Design token** menyelesaikan kelas masalah ini, dan lebih dari itu. Scroll ini menjelaskan apa itu token, bagaimana menyusunnya dalam tiga lapisan, bagaimana menghubungkan Figma ke kode, dan kesalahan yang paling sering kami lihat.

![Palet warna dan sampel swatch di atas meja desainer](unsplash:1561070791-2526d30994b5)
*Warna, jarak, dan tipografi adalah keputusan desain. Token adalah tempat keputusan itu dicatat satu kali.*

## Apa itu design token

Token adalah **pasangan nama dan nilai** untuk keputusan desain yang berulang: warna, ukuran font, jarak, radius, bayangan, durasi animasi. Alih-alih menulis `#3B82F6` di 200 tempat, kamu menulis `color.brand.primary` dan mendefinisikan nilainya di satu tempat.

Manfaatnya:

| Tanpa token | Dengan token |
|---|---|
| Nilai hardcode tersebar | Satu sumber kebenaran |
| Ganti warna brand = cari-ganti berisiko | Ganti satu nilai, semua ikut |
| Mode gelap = menulis ulang semuanya | Ganti peta token per tema |
| Desain dan kode bisa berbeda diam-diam | Keduanya membaca sumber yang sama |
| Sulit konsisten antar platform (web, iOS, Android) | Satu definisi, banyak keluaran |

## Tiga lapisan token

Kesalahan awal adalah satu daftar datar `blue-500`, `gray-100`, dan seterusnya. Itu *primitif*, dan belum cukup. Pisahkan menjadi tiga lapisan.

### 1. Primitive (global): nilai mentah

Skala warna dan ukuran tanpa makna pemakaian.

```json
{
  "color": {
    "blue":  { "500": "#3B82F6", "600": "#2563EB", "100": "#DBEAFE" },
    "gray":  { "900": "#1F2937", "600": "#4B5563", "100": "#F3F4F6" },
    "green": { "500": "#10B981" }
  },
  "space": { "1": "4px", "2": "8px", "3": "12px", "4": "16px", "6": "24px" },
  "radius": { "sm": "8px", "md": "12px", "lg": "20px" }
}
```

### 2. Semantic (alias): makna pemakaian

Nama menjelaskan **untuk apa**, bukan **seperti apa**.

```json
{
  "color": {
    "text":    { "primary": "{color.gray.900}", "secondary": "{color.gray.600}" },
    "surface": { "base": "#F0F2F5", "raised": "{color.gray.100}" },
    "action":  { "primary": "{color.blue.500}", "primary-hover": "{color.blue.600}" },
    "feedback":{ "success": "{color.green.500}" }
  }
}
```

Di sinilah mode gelap menjadi mudah: `text.primary` menunjuk `gray.900` di tema terang, dan `gray.100` di tema gelap. Komponen tidak berubah, hanya peta alias.

### 3. Component (opsional): token spesifik komponen

```json
{
  "button": {
    "primary": {
      "bg": "{color.action.primary}",
      "bg-hover": "{color.action.primary-hover}",
      "radius": "{radius.md}",
      "padding-x": "{space.4}"
    }
  }
}
```

Lapisan ini berguna ketika tim besar dan ada banyak varian, tapi **jangan membuatnya terlalu dini**. Banyak tim kecil cukup dengan dua lapisan.

Aturan penamaan yang kami pakai:

- Gunakan `kebab-case` dan hierarki titik: `color.text.primary`.
- Nama semantik **tidak** menyebut warna (`color.text.primary`, bukan `color.text.dark-gray`), karena warnanya bisa berubah.
- Nilai yang ditunjuk komponen selalu token semantik atau komponen, **tidak pernah primitif langsung**.

![Ikon aplikasi desain di meja](unsplash:1626785774573-4b799315345d)
*Ikon aplikasi desain di meja.*

## Di Figma: Variables

Fitur **Variables** di Figma menyimpan token sebagai nilai yang bisa dipakai pada fill, stroke, jarak, radius, dan teks.

1. Buat *collection* `Primitives` dengan mode tunggal.
2. Buat collection `Semantic` dengan **dua mode**: `Light` dan `Dark`. Tiap variabel semantik menunjuk (alias) ke primitif berbeda per mode.
3. Terapkan variabel semantik pada komponen. **Jangan memilih warna dengan eyedropper atau hex**.
4. Di file lain, publikasikan sebagai library supaya semua proyek memakainya.

Tes sederhana: ganti mode ke `Dark` pada satu frame. Jika ada elemen yang tidak berubah, berarti elemen itu masih memakai nilai hardcode.

## Dari Figma ke kode

Pipeline yang kami pakai:

```
Figma Variables
   │  (plugin Tokens Studio / export JSON, atau Variables REST API)
   ▼
tokens.json  ──►  Style Dictionary  ──►  tokens.css   (CSS custom properties)
                                     └►  tokens.ts    (konstanta TypeScript)
                                     └►  tokens.xml   (Android, bila perlu)
```

**Style Dictionary** membaca JSON token dan menghasilkan keluaran per platform. Contoh konfigurasi untuk CSS:

```js
// style-dictionary.config.js
export default {
  source: ['tokens/**/*.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'src/styles/',
      files: [{ destination: 'tokens.css', format: 'css/variables' }],
    },
  },
}
```

Hasil `tokens.css`:

```css
:root {
  --color-text-primary: #1f2937;
  --color-action-primary: #3b82f6;
  --space-4: 16px;
  --radius-md: 12px;
}
[data-theme='dark'] {
  --color-text-primary: #f3f4f6;
  --color-action-primary: #60a5fa;
}
```

Komponen hanya membaca variabel:

```css
.button-primary {
  background: var(--color-action-primary);
  padding-inline: var(--space-4);
  border-radius: var(--radius-md);
}
```

Jika memakai Tailwind v4, token dapat didaftarkan lewat `@theme` sehingga kelas utilitas langsung memakainya.

## Yang layak dijadikan token

| Kategori | Contoh |
|---|---|
| Warna | brand, teks, permukaan, border, status |
| Tipografi | family, ukuran, bobot, line-height, letter-spacing |
| Jarak | skala 4px (4, 8, 12, 16, 24, 32, 48) |
| Radius | sm, md, lg, full |
| Bayangan / elevasi | raised, pressed (untuk neumorphism), overlay |
| Gerak | durasi (fast 150 ms, base 250 ms), easing |
| Breakpoint / container | sm, md, lg |
| Z-index | dropdown, modal, toast |

Jangan membuat token untuk nilai yang hanya dipakai sekali. Token adalah untuk **keputusan yang berulang**.

## Tata kelola: siapa boleh mengubah apa

Token tanpa proses akan menjadi tempat sampah. Aturan tim kami:

1. **Pemilik jelas**: tim desain sistem (Maya) menyetujui perubahan token semantik.
2. **Perubahan lewat PR**: file `tokens/*.json` ada di repo; PR menampilkan diff nilai.
3. **Versioning**: perubahan merusak (rename, hapus) menaikkan versi mayor dan masuk catatan rilis.
4. **Deprecation**: token lama ditandai dan dipertahankan satu rilis dengan peringatan lint.
5. **Audit berkala**: skrip mencari nilai hex/px mentah di kode dan melaporkannya.

```bash
# audit sederhana: hex hardcode di komponen
grep -rnE "#[0-9a-fA-F]{3,8}" src/components | grep -v "tokens"
```

## Kesalahan yang sering kami lihat

| Kesalahan | Dampak | Perbaikan |
|---|---|---|
| Hanya primitif, tidak ada semantik | Tema gelap tak mungkin | Tambah lapisan semantik |
| Nama berdasar warna (`gray-dark-text`) | Rename saat warna berubah | Nama berdasar peran |
| Terlalu banyak token | Tidak ada yang tahu mana yang dipakai | Hanya buat untuk pola berulang |
| Figma dan kode tidak tersinkron | Drift diam-diam | Satu sumber (JSON) + pipeline |
| Token untuk segalanya, termasuk margin sekali pakai | Beban perawatan | Hanya keputusan berulang |
| Mengabaikan kontras di tema gelap | Teks tidak terbaca | Uji kontras setiap pasangan (lihat scroll aksesibilitas) |

## Memulai dalam satu minggu

1. **Hari 1**: audit. Ekspor semua warna, ukuran font, dan jarak yang dipakai di produk; lihat berapa banyak varian hampir-sama.
2. **Hari 2**: tetapkan skala (warna 8–10 langkah, jarak kelipatan 4, 5–6 ukuran font).
3. **Hari 3**: buat primitif dan semantik di Figma Variables.
4. **Hari 4**: pipeline Style Dictionary → CSS variables.
5. **Hari 5**: migrasikan satu halaman penuh dan pasang audit hex di CI.

Satu halaman penuh yang benar-benar bebas hardcode lebih berharga daripada sepuluh halaman setengah jadi.

## Penutup

Token bukan soal teknologi; ia soal **percakapan yang berhenti**: tidak ada lagi "biru yang mana?" karena jawabannya ada di satu tempat. Begitu desainer dan developer membaca sumber yang sama, review desain berubah dari berburu selisih piksel menjadi membahas keputusan.

Referensi: W3C Design Tokens Community Group (format spesifikasi), dokumentasi Figma Variables, dan dokumentasi Style Dictionary.

<!--comments-->
putriayu: Tiga lapisan token ini akhirnya menjawab kenapa tema gelap di prototipe saya selalu berantakan. Saya hanya punya primitif.
maya_kusuma: Itu kesalahan paling umum, Putri. Mulai dari semantik untuk teks dan surface, lalu tambahkan sisanya bertahap.
raka_m: Dari frontend, kami sudah memakai CSS variables dari hasil Style Dictionary. Satu catatan: pastikan nama variabel stabil karena itu API publik untuk komponen.
salsa_nur: Aturan 'jangan pakai eyedropper' bagus. Tes mengganti mode ke Dark itu cara cepat menemukan hardcode.
dewilestari: Bagaimana dengan nilai spasial yang tidak sesuai skala 4px, misal 10px?
maya_kusuma: Kalau muncul berkali-kali, mungkin skalanya yang perlu disesuaikan. Kalau hanya sekali, itu pengecualian dan sebaiknya dipertanyakan di review.
rizkymaul: Boleh dibagi repo contoh untuk pipeline Style Dictionary-nya?
maya_kusuma: Akan saya bagikan di channel #design-system minggu ini.
