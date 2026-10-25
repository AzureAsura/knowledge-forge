---
title: Neumorphism: Kapan Cantik, Kapan Merusak Aksesibilitas (Pelajaran dari KnoFo)
author: putriayu
category: design-ui
difficulty: intermediate
status: published
age: 6
featured: false
cover: unsplash:1609921212029-bb5a28e60960
---

KnoFo memakai gaya **neumorphism** (atau *soft UI*): elemen tampak timbul atau tenggelam dari permukaan yang sewarna, dengan bayangan terang di satu sisi dan gelap di sisi lain. Kami menyukainya karena terasa lembut dan khas. Tapi setelah beberapa ronde review aksesibilitas, saya belajar bahwa gaya ini punya batas, dan lebih baik kita tahu batas itu daripada menemukannya dari keluhan pengguna.

Scroll ini adalah catatan saya sebagai desainer junior: bagaimana neumorphism bekerja, di mana ia gagal, dan aturan yang kami terapkan agar KnoFo tetap cantik sekaligus bisa dipakai.

![Layar monitor menampilkan desain antarmuka aplikasi mobile](unsplash:1609921212029-bb5a28e60960)
*Gaya yang mengandalkan bayangan lembut harus dites pada layar terang, redup, dan di bawah sinar matahari.*

## Anatomi neumorphism

Neumorphism hanya memakai tiga bahan:

1. **Latar dan elemen sewarna**, misalnya abu kebiruan `#F0F2F5`.
2. **Bayangan terang** di sisi atas-kiri (seolah cahaya datang dari sana).
3. **Bayangan gelap** di sisi bawah-kanan.

```css
.neu-raised {
  background: #f0f2f5;
  box-shadow: -6px -6px 12px #ffffff,
               6px  6px 12px #d1d5db;
}
.neu-pressed {
  background: #f0f2f5;
  box-shadow: inset -4px -4px 8px #ffffff,
              inset  4px  4px 8px #d1d5db;
}
```

`raised` = tombol menonjol; `pressed` = tombol ditekan atau input. Beralih dari raised ke pressed memberi umpan balik klik yang terasa fisik.

## Di mana neumorphism bersinar

| Cocok | Kenapa |
|---|---|
| Dashboard dan kartu statistik | Banyak panel sejenis; bayangan lembut menciptakan hierarki tenang |
| Kontrol sederhana (toggle, slider) | Metafora fisik jelas |
| Konteks mood rileks (kesehatan, musik, produktivitas) | Karakter lembutnya cocok |
| Elemen dekoratif dan status | Tidak butuh kontras tinggi |

Di KnoFo, kartu scroll, panel analitik, dan kontainer kecil adalah tempat gaya ini bekerja dengan baik.

![Palet warna dan swatch](unsplash:1561070791-2526d30994b5)
*Palet warna dan swatch.*

## Di mana neumorphism gagal

Masalah utamanya satu: **kontras tepi rendah**. Karena elemen dan latar sewarna, satu-satunya pembeda adalah bayangan tipis. Akibatnya:

| Masalah | Dampak |
|---|---|
| Batas tombol nyaris tak terlihat | Pengguna tidak tahu mana yang bisa diklik |
| Bayangan hilang pada layar kecerahan rendah/di bawah matahari | Antarmuka tampak datar |
| Status (aktif/nonaktif) hanya dibedakan bayangan | Sulit dibaca |
| Fokus keyboard tidak terlihat | Pengguna keyboard tersesat |
| Pengguna dengan penglihatan rendah | Kehilangan struktur halaman |

WCAG 1.4.11 mensyaratkan komponen UI dan batasnya berkontras minimal **3:1** terhadap sekitarnya. Bayangan neumorphic standar biasanya berkontras sekitar 1,1–1,5:1. Itu gagal.

## Audit kami: apa yang kami ubah

Setelah audit, kami menyepakati aturan berikut (kamu bisa melihatnya di KnoFo):

### 1. Teks dan ikon tidak ikut samar

Teks selalu berkontras tinggi: `#1F2937` (≈13:1) untuk judul, `#4B5563` (≈6,7:1) untuk isi. Warna abu medium `#6B7280` hanya dipakai untuk teks pendukung kecil yang tidak penting, dan hasil audit menyuruh kami menaikkannya bila berfungsi sebagai informasi.

### 2. Aksi utama memakai warna isi

Tombol utama berwarna biru solid dengan teks putih, bukan hanya raised abu. Satu tombol yang jelas jauh lebih mudah dipindai daripada lima tombol timbul identik. (Catatan: biru terang `#3B82F6` dengan teks putih berkontras ~3,7:1; kami memeriksanya untuk teks tebal dan mempertimbangkan biru yang lebih tua.)

### 3. Status tidak bergantung bayangan saja

Tab aktif = warna isi biru + teks putih; tab tidak aktif = raised abu. Jadi status terbaca dari warna isi, bukan perbedaan halus bayangan.

### 4. Fokus punya outline solid

```css
:is(button, a, input, [tabindex]):focus-visible {
  outline: 3px solid #1d4ed8;
  outline-offset: 2px;
}
```

Bayangan lembut tidak cukup sebagai indikator fokus. Outline solid lebih terlihat, dan hanya muncul saat navigasi keyboard (`:focus-visible`).

### 5. Input form punya batas yang terlihat

Field teks memakai `pressed` (inset) **plus** label di atasnya. Untuk field yang kritis (password, jumlah uang), tambahkan border tipis `1px solid #9CA3AF` (≥3:1) agar terlihat jelas.

### 6. Hierarki tidak hanya dari bayangan

Pakai ukuran, bobot teks, dan jarak untuk hierarki. Bayangan hanya mempertegas, bukan satu-satunya petunjuk.

## Uji yang perlu dilakukan

1. **Kecerahan rendah**: turunkan kecerahan layar ke 30% dan lihat apakah batas elemen masih terlihat.
2. **Mode grayscale**: DevTools → *Rendering → Emulate vision deficiencies → Achromatopsia* untuk memastikan informasi tidak hanya lewat warna.
3. **Zoom 200%**: apakah elemen tetap terbaca dan tidak bertumpuk?
4. **Keyboard saja**: Tab melalui halaman; apakah selalu jelas di mana fokus?
5. **Cahaya matahari**: bawa laptop atau ponsel ke luar.
6. **Alat otomatis**: Lighthouse dan axe memeriksa kontras teks, tetapi **tidak** memeriksa batas bayangan, jadi pemeriksaan manual tetap perlu.

## Variasi aman: "soft UI" yang lebih kuat

Beberapa penyesuaian yang mempertahankan nuansa tanpa mengorbankan kontras:

- Naikkan kontras bayangan gelap (`#d1d5db` → `#b8bec8`) dan tambahkan **border 1px** halus (`rgba(0,0,0,0.06)`) pada elemen interaktif.
- Gunakan **warna aksen** untuk status aktif dan elemen penting; netral untuk dekorasi.
- Gunakan neumorphism untuk **kontainer** (kartu, panel) dan gaya datar yang jelas untuk **kontrol** (tombol, input, tab).
- Sediakan tema **kontras tinggi** (`prefers-contrast: more`) yang mematikan bayangan dan memakai border jelas.

```css
@media (prefers-contrast: more) {
  .neu-raised, .neu-pressed {
    box-shadow: none;
    border: 2px solid #1f2937;
  }
}
```

## Mengkomunikasikannya ke tim

Desainer sering tergoda mempertahankan gaya demi estetika; developer mengikuti desain apa adanya. Tugas kita adalah menjadikan aksesibilitas bagian dari **definisi selesai** komponen:

- [ ] Kontras teks ≥ 4,5:1 (besar ≥ 3:1).
- [ ] Batas komponen interaktif ≥ 3:1 atau ada penanda lain (warna isi, ikon, label).
- [ ] State fokus terlihat.
- [ ] Informasi tidak hanya lewat warna atau bayangan.
- [ ] Diuji pada kecerahan rendah.

## Penutup

Saya masih menyukai neumorphism, tapi sekarang saya memperlakukannya seperti bumbu kuat: sedikit memberi karakter, terlalu banyak merusak. Gaya yang baik adalah gaya yang bisa dipakai oleh orang yang paling sulit melihatnya.

Terima kasih Kak Maya untuk review dan Salsa yang membantu pengujian di bawah sinar matahari.

Referensi: W3C WCAG 2.2 (*1.4.11 Non-text Contrast*), artikel *Neumorphism in user interfaces* oleh Nielsen Norman Group, dan MDN (*prefers-contrast*).

<!--comments-->
maya_kusuma: Pelajaran bagus, Putri, dan jujur. Aturan 'kontainer boleh neumorphic, kontrol harus jelas' itu pegangan yang bisa kita tulis di guideline.
putriayu: Terima kasih Kak Maya. Saya akan menambahkannya ke dokumentasi komponen.
salsa_nur: Tes di bawah matahari itu benar-benar mengejutkan. Tab yang tidak aktif nyaris hilang. Senang jadi bagian audit ini.
raka_m: Kami sudah menambahkan outline fokus global di CSS. Kalau ada komponen yang masih tanpa fokus terlihat, kirim daftar, saya perbaiki.
dewilestari: Media query prefers-contrast baru buat saya. Boleh saya terapkan di KnoFo?
raka_m: Silakan buat PR-nya, Dewi. Saya review besok.
citraang: Sebagai pengguna baru KnoFo, saya sempat bingung mana yang tombol dan mana kartu. Mungkin ini penyebabnya.
