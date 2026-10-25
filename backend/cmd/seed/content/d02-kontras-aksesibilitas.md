---
title: Kontras Warna dan Aksesibilitas: Lulus WCAG 2.2 Tanpa Mengorbankan Estetika
author: maya_kusuma
category: design-ui
difficulty: intermediate
status: published
age: 78
featured: false
cover: unsplash:1581291518857-4e27b48ff24e
---

"Abu-abu muda itu elegan." Saya pernah bilang begitu di tahun-tahun awal karier saya, dan saya salah. Abu-abu muda di atas putih adalah salah satu kombinasi yang paling sering gagal dibaca oleh orang dengan penglihatan rendah, oleh siapa pun di bawah sinar matahari, dan oleh kita semua pada layar ponsel yang kecerahannya diturunkan.

Aksesibilitas bukan lapisan akhir yang merusak desain. Ia batasan yang, jika dipakai sejak awal, membuat desain lebih jelas. Scroll ini menjelaskan aturan kontras dan target sentuh dari **WCAG 2.2**, cara mengujinya, dan trik mempertahankan estetika (termasuk gaya neumorphic yang terkenal bermasalah).

![Sketsa wireframe yang digambar dengan pena](unsplash:1581291518857-4e27b48ff24e)
*Desain yang bisa dipakai semua orang bukan kompromi; ia desain yang selesai.*

## WCAG dalam satu paragraf

**Web Content Accessibility Guidelines (WCAG)** adalah standar W3C. Memiliki tiga tingkat kepatuhan: **A** (minimum), **AA** (target umum dan syarat hukum di banyak negara), dan **AAA** (tertinggi). Versi 2.2 menambahkan kriteria baru seputar fokus keyboard, ukuran target, dan autentikasi. Targetkan **AA** sebagai dasar.

## Kontras teks

Rasio kontras dihitung dari luminansi relatif dua warna, berkisar 1:1 (identik) sampai 21:1 (hitam di atas putih).

| Kriteria | Rasio minimum (AA) | AAA |
|---|---|---|
| Teks normal (< 18 pt atau < 14 pt tebal) | **4,5 : 1** | 7 : 1 |
| Teks besar (≥ 18 pt, atau ≥ 14 pt tebal) | **3 : 1** | 4,5 : 1 |
| Komponen UI dan grafik yang bermakna (ikon, border input) | **3 : 1** | – |
| Indikator fokus | **3 : 1** terhadap sekitarnya | – |
| Teks dekoratif / nonaktif | tidak disyaratkan | – |

Contoh nyata dari palet kita:

| Pasangan | Rasio | Hasil |
|---|---|---|
| `#1F2937` di atas `#F0F2F5` | ≈ 13,1 : 1 | ✅ lulus AAA |
| `#4B5563` di atas `#F0F2F5` | ≈ 6,7 : 1 | ✅ lulus AA |
| `#6B7280` di atas `#F0F2F5` | ≈ 4,3 : 1 | ⚠️ gagal AA untuk teks normal |
| `#9CA3AF` di atas `#F0F2F5` | ≈ 2,3 : 1 | ❌ gagal |
| Putih di atas `#3B82F6` | ≈ 3,7 : 1 | ⚠️ hanya lulus untuk teks besar |
| Putih di atas `#2563EB` | ≈ 5,2 : 1 | ✅ lulus AA |

Perhatikan baris keempat dan kelima: biru terang `#3B82F6` sangat populer sebagai tombol, tapi teks putih kecil di atasnya **gagal AA**. Solusi tanpa mengubah kesan: pakai biru satu langkah lebih gelap (`#2563EB`) untuk tombol bersolid, atau naikkan teks menjadi tebal 14 pt+ (kategori teks besar).

> Angka di atas dibulatkan; selalu hitung dengan alat, jangan menghafalnya.

![Palet warna dan swatch](unsplash:1561070791-2526d30994b5)
*Palet warna dan swatch.*

## Cara menguji

1. **Plugin Figma**: Stark, Contrast, atau A11y - Color Contrast Checker; tampilkan rasio langsung saat memilih warna.
2. **Browser DevTools**: pilih elemen → panel Styles → klik kotak warna; ada indikator rasio kontras dan garis ambang AA/AAA.
3. **Lighthouse** dan **axe DevTools**: memeriksa halaman nyata secara otomatis, termasuk teks di atas gambar.
4. **Simulasi buta warna**: emulasi di Chrome DevTools (*Rendering → Emulate vision deficiencies*) memeriksa apakah informasi tidak hanya dibawa warna.
5. **Uji manual**: turunkan kecerahan layar dan lihat di luar ruangan.

## Jangan hanya mengandalkan warna

Aturan WCAG 1.4.1: warna tidak boleh menjadi satu-satunya penanda informasi. Contoh:

| Buruk | Baik |
|---|---|
| Field error hanya berborder merah | Border merah **+ ikon + teks pesan** |
| Grafik dengan garis berbeda warna saja | Warna **+ pola/label/penanda berbeda** |
| Link di paragraf hanya berwarna | Berwarna **+ garis bawah** |
| Status "aktif/nonaktif" hanya hijau/abu | Teks atau ikon "Aktif" |

Sekitar 8% pria memiliki buta warna merah-hijau; desain yang hanya mengandalkan warna gagal bagi mereka.

## Target sentuh dan klik (WCAG 2.2)

Kriteria baru **2.5.8 Target Size (Minimum)** (AA): target pointer minimal **24 × 24 CSS piksel**, kecuali ada ruang yang cukup di sekitarnya (lingkaran 24 px yang berpusat pada target tidak boleh bersinggungan dengan target lain) atau ada cara lain yang setara. Untuk sentuhan di ponsel, panduan platform menyarankan jauh lebih besar: **44 × 44 pt** (Apple) atau **48 × 48 dp** (Material).

Praktisnya:

- Tombol ikon 16 px **boleh** tetap secara visual, tapi area klik diperluas dengan padding hingga ≥ 40 px.
- Beri jarak minimal 8 px antar target berdekatan.
- Tautan di dalam paragraf pengecualian (inline), tapi item daftar link tidak.

```css
.icon-button {
  width: 24px;  height: 24px;     /* ikon terlihat kecil */
  padding: 10px;                  /* area klik 44px */
  box-sizing: content-box;
  cursor: pointer;
}
```

## Fokus keyboard

Pengguna keyboard dan pembaca layar harus selalu tahu posisi fokus. Jangan hapus outline tanpa pengganti:

```css
/* ❌ menghilangkan fokus untuk semua orang */
button:focus { outline: none }

/* ✅ gaya fokus yang jelas, hanya untuk navigasi keyboard */
button:focus-visible {
  outline: 3px solid #1d4ed8;
  outline-offset: 2px;
}
```

WCAG 2.2 menambahkan **2.4.11 Focus Not Obscured (Minimum)** (AA): elemen yang fokus tidak boleh tertutup sepenuhnya oleh konten lain seperti header sticky atau banner cookie. Uji dengan menekan Tab dan melihat apakah elemen terfokus tersembunyi di balik bilah tetap. `scroll-margin-top` pada elemen membantu.

Indikator fokus yang tebal dan berkontras ≥ 3:1 juga memenuhi persyaratan yang lebih ketat (2.4.13 Focus Appearance, AAA).

## Neumorphism dan kontras

Neumorphism (gaya "timbul lembut" dengan bayangan terang dan gelap pada latar sewarna) cantik tetapi terkenal bermasalah: tepi elemen nyaris tak terlihat karena kontras tepi dengan latar rendah (sering < 1,5:1), sehingga **batas komponen interaktif tidak memenuhi 3:1**.

Cara kami menjaga gaya itu tanpa mengorbankan keterbacaan:

1. **Teks dan ikon** selalu memakai warna kontras penuh (≥ 4,5:1), bukan abu samar.
2. Beri **status** yang tidak hanya bergantung pada bayangan: tombol aktif memakai warna isi (biru) selain `pressed` inset.
3. **Fokus** memakai outline solid, bukan bayangan lembut.
4. Input form memakai border tipis berkontras ≥ 3:1 atau latar `pressed` yang jelas **plus** label.
5. Gunakan bayangan terang/gelap sedikit lebih kuat daripada standar dan uji di kecerahan rendah.
6. Jangan memakai neumorphism untuk elemen kritis seperti tombol hapus tanpa penanda tambahan (ikon + label).

## Mode gelap

Kontras harus diuji **ulang** di mode gelap; pasangan lulus di terang bisa gagal di gelap (misalnya biru terang di atas hitam bisa terlalu menyilaukan, dan abu medium bisa kurang kontras). Hindari hitam murni `#000` pada area luas; pakai abu sangat gelap (`#111827`) dan teks `#F3F4F6` untuk mengurangi "halo". Token semantik (lihat scroll *Design Token*) membuat pengujian ini sistematis.

## Gerak dan preferensi pengguna

- Hormati `prefers-reduced-motion`: matikan animasi besar (parallax, slide, konfeti).
- Hindari konten yang berkedip lebih dari 3 kali per detik (risiko kejang).
- Beri kontrol pada animasi otomatis (jeda/berhenti).

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important }
}
```

## Checklist cepat per layar

- [ ] Semua teks ≥ 4,5:1 (besar ≥ 3:1).
- [ ] Ikon dan border kontrol ≥ 3:1 terhadap latar.
- [ ] Informasi tidak hanya lewat warna.
- [ ] Target ≥ 24 px (idealnya ≥ 44 px di mobile) dengan jarak.
- [ ] Fokus keyboard terlihat dan tidak tertutup.
- [ ] Mode gelap diuji ulang.
- [ ] Animasi menghormati reduced motion.
- [ ] Label form selalu terlihat (bukan hanya placeholder).

## Penutup

Aksesibilitas yang baik hampir selalu terlihat sebagai **desain yang lebih jelas** untuk semua orang. Tombol yang lebih besar membantu jempol, kontras yang kuat membantu mata lelah, dan label yang jelas membantu siapa pun yang terburu-buru. Mulailah dari pasangan warna di token, dan ujilah sebelum developer menyentuhnya.

Referensi: W3C WCAG 2.2 (*1.4.3 Contrast (Minimum)*, *1.4.11 Non-text Contrast*, *2.4.11 Focus Not Obscured*, *2.5.8 Target Size (Minimum)*) dan *What's New in WCAG 2.2*.

<!--comments-->
putriayu: Tabel pasangan warna dari palet kita sangat membuka mata. Saya tidak sadar putih di atas biru tombol kita ternyata kurang dari 4,5.
maya_kusuma: Biru tombol saat ini 3,7:1, itu memang pekerjaan rumah kita. Kita bahas di sprint depan apakah naik satu langkah atau teksnya dibuat tebal.
raka_m: Dari sisi frontend, kita bisa menambah lint untuk kontras di CI memakai axe. Tapi perubahan token tetap harus dari desain.
salsa_nur: Bagian neumorphism terasa dekat dengan produk kita. Kita butuh outline fokus yang jelas, karena bayangan lembut hampir tak terlihat saat Tab.
citraang: Saya anggota baru dan tidak tahu soal target sentuh 44 px. Ternyata ikon-ikon kecil di desain saya terlalu sempit!
maya_kusuma: Wajar, Citra. Kita koreksi bersama di sesi review besok, dan saya kirim template tombol ikon dengan padding.
dewilestari: Terima kasih untuk potongan CSS focus-visible. Di KnoFo tombol tertentu masih memakai outline none dan saya akan memperbaikinya.
