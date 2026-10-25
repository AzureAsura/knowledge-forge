---
title: Menulis Microcopy yang Jelas: Pesan Error, Empty State, dan Tombol yang Tidak Membingungkan
author: putriayu
category: design-ui
difficulty: beginner
status: published
age: 20
featured: false
cover: unsplash:1600132806370-bf17e65e942f
---

Waktu saya magang, saya mendesain layar dengan pesan error: **"Terjadi kesalahan. Silakan coba lagi."** Kak Maya menyilangnya dengan pena merah dan menulis satu pertanyaan: "Kesalahan apa? Kenapa terjadi? Apa yang harus pengguna lakukan sekarang?" Saya tidak bisa menjawab satu pun.

*Microcopy* adalah teks kecil di antarmuka: label tombol, placeholder, pesan error, empty state, tooltip, konfirmasi. Teksnya kecil, tapi dampaknya besar: di momen-momen itulah pengguna memutuskan lanjut atau menyerah. Scroll ini adalah kumpulan prinsip dan contoh sebelum-sesudah dari proyek KnoFo.

![Cetak biru dan sketsa antarmuka di meja](unsplash:1600132806370-bf17e65e942f)
*Setiap kata di antarmuka adalah keputusan desain, sama seperti warna dan jarak.*

## Lima prinsip

1. **Jelas dulu, lucu belakangan.** Humor boleh, tapi tidak boleh mengorbankan kejelasan.
2. **Bicara seperti manusia.** Hindari jargon sistem ("Error 500", "Request failed", "Invalid input").
3. **Katakan apa yang terjadi dan apa yang bisa dilakukan.** Setiap pesan masalah butuh dua bagian: kondisi + langkah berikutnya.
4. **Pendek, tapi bukan samar.** Buang kata tidak perlu, pertahankan informasi.
5. **Konsisten.** Satu istilah untuk satu hal ("Simpan" bukan kadang "Save", kadang "Submit", kadang "Kirim").

## Label tombol: kata kerja spesifik

Tombol harus menjawab "apa yang terjadi kalau saya menekan ini?".

| Samar | Jelas |
|---|---|
| OK | Simpan perubahan |
| Submit | Kirim untuk review |
| Ya / Tidak | Hapus scroll / Batal |
| Lanjut | Lanjut ke pembayaran |
| Klik di sini | Lihat panduan lengkap |

Untuk dialog konfirmasi destruktif, tombol harus mengulang aksinya: **"Hapus scroll"** dan **"Batal"**, bukan "Ya" dan "Tidak". Pengguna yang membaca sekilas tetap paham.

Urutan: aksi utama konsisten posisinya (kanan di desktop), aksi merusak diberi warna berbeda (merah) dan tidak menjadi default.

![Palet warna dan swatch](unsplash:1561070791-2526d30994b5)
*Palet warna dan swatch.*

## Pesan error: tiga bagian

Formula: **apa yang salah + kenapa (jika berguna) + apa yang bisa dilakukan.**

| Sebelum | Sesudah |
|---|---|
| Terjadi kesalahan. | Scroll belum tersimpan karena koneksi terputus. Cek koneksi, lalu coba lagi. |
| Invalid input | Judul minimal 5 karakter. |
| Email tidak valid | Alamat email perlu memuat "@", misalnya nama@kantor.com |
| Akses ditolak (403) | Kamu tidak punya izin untuk menyetujui scroll sendiri. Minta senior lain untuk mereview. |
| Terlalu banyak permintaan | Terlalu banyak percobaan. Coba lagi dalam 45 detik. |

Prinsip tambahan:

- **Jangan menyalahkan pengguna.** "Kamu memasukkan password salah" → "Email atau password tidak cocok."
- **Tempatkan pesan dekat sumbernya** (di bawah field), bukan hanya di toast di pojok.
- **Gunakan `aria-live`/`role="alert"`** agar pembaca layar mengumumkannya.
- **Jangan hanya warna merah**; sertakan ikon dan teks (lihat scroll kontras).
- Untuk error sistem yang bukan salah pengguna, minta maaf singkat dan beri jalan keluar: "Kami gagal memuat scroll. Coba segarkan halaman."

## Empty state: peluang, bukan kekosongan

Empty state adalah momen pengguna bingung "lalu saya harus apa?". Isi tiga hal: **jelaskan, beri alasan, beri aksi.**

| Konteks | Contoh |
|---|---|
| Daftar scroll kosong (baru) | **Belum ada scroll.** Tulis scroll pertamamu dan bagikan hal yang kamu pelajari. [Tulis scroll] |
| Hasil pencarian kosong | **Tidak ada hasil untuk "pooling".** Coba kata kunci lain atau hapus filter. [Hapus filter] |
| Bookmark kosong | **Belum ada yang disimpan.** Tekan ikon bookmark pada scroll yang ingin kamu baca nanti. |
| Antrean review kosong | **Antrean bersih.** Tidak ada scroll yang menunggu review. |

Perhatikan perbedaan antara kosong karena **belum pernah ada** (ajak mulai), kosong karena **filter** (bantu melonggarkan), dan kosong karena **tugas selesai** (rayakan secara sederhana). Teks yang sama untuk ketiganya selalu salah di dua dari tiga situasi.

## Placeholder bukan label

Placeholder hilang saat mengetik, sering berkontras rendah, dan tidak diumumkan konsisten oleh pembaca layar. Gunakan **label yang selalu terlihat**, dan placeholder hanya untuk contoh format:

- Label: **Judul scroll**
- Placeholder: *Contoh: Panduan Rule Tile di Unity*
- Teks bantuan di bawah: *5–120 karakter.*

## Konfirmasi dan toast

| Situasi | Pola |
|---|---|
| Aksi berhasil, ringan | Toast pendek: "Scroll disimpan" |
| Aksi berhasil, ada konsekuensi | Sebut hasilnya: "Scroll dikirim untuk review. Kamu akan diberi tahu saat disetujui." |
| Aksi bisa dibatalkan | Toast dengan **Urungkan** selama beberapa detik |
| Aksi tidak bisa dibatalkan | Dialog konfirmasi yang menyebut objek: "Hapus 'Rule Tile di Unity'? Tindakan ini tidak bisa dibatalkan." |

Hindari "Berhasil!" tanpa konteks. Berhasil apa?

## Nada suara

Tentukan satu nada dan pakai konsisten. Untuk KnoFo: **hangat, ringkas, dan kolega**, bukan formal kaku dan bukan terlalu akrab.

| Terlalu formal | Seimbang | Terlalu santai |
|---|---|---|
| Permintaan Anda telah berhasil diproses. | Scroll kamu sudah dikirim. | Yeay, beres! 🎉 |
| Mohon maaf atas ketidaknyamanan. | Maaf, ada masalah. Coba lagi ya. | Waduh, error nih! |

Gunakan "kamu" secara konsisten (bukan campur "Anda" dan "kamu"). Hindari emoji pada pesan error atau yang menyangkut konsekuensi serius.

## Angka, tanggal, dan satuan

- Tulis tanggal dengan format yang dipahami pengguna lokal (`12 Mar 2026`), dan gunakan bentuk relatif ("3 jam lalu") untuk konten baru dengan tooltip tanggal lengkap.
- Satuan jelas: "5 menit baca", "1,2 rb tayangan".
- Hindari singkatan yang ambigu.

## Proses menulis microcopy

1. Tulis versi pertama tanpa menyaring.
2. Potong 30%: hapus "Anda dapat", "silakan", "harap".
3. Baca keras-keras; kalau terdengar seperti robot, ulangi.
4. Uji dengan orang yang tidak mengenal produk: minta mereka menjelaskan apa yang akan terjadi.
5. Simpan di satu tempat (spreadsheet/bank string) agar istilah konsisten dan mudah dilokalisasi.

## Checklist per layar

- [ ] Semua tombol berupa kata kerja spesifik.
- [ ] Setiap error punya langkah berikutnya.
- [ ] Tiga jenis empty state dibedakan.
- [ ] Field punya label yang terlihat.
- [ ] Istilah konsisten di seluruh produk.
- [ ] Nada sesuai pedoman.

## Penutup

Saya dulu menganggap menulis teks antarmuka sebagai pekerjaan terakhir yang boleh asal. Sekarang saya melakukannya di awal, karena kata-kata membentuk alur: ketika sulit menulis label sebuah tombol, sering kali alurnya yang belum jelas.

Terima kasih Kak Maya atas pena merahnya.

Referensi: *Microcopy: The Complete Guide* (Kinneret Yifrah), panduan *Writing for the Web* dari Nielsen Norman Group, dan *Content design* dari GOV.UK.

<!--comments-->
maya_kusuma: Pena merah itu cinta, Putri. Tulisan ini sudah jauh lebih baik dari mockup pertamamu. Tiga jenis empty state itu penting, dan kita belum membedakannya di KnoFo.
putriayu: Terima kasih Kak. Saya akan buat usulan teks untuk tiga jenis itu di halaman Scrolls dan Bookmark.
raka_m: Dari frontend, kita bisa memisahkan komponen EmptyState dengan prop jenis. Kirim teks final, saya sambungkan.
dewilestari: Aku mau mengubah pesan error di form komentar. Sekarang cuma bilang 'Terjadi kesalahan'.
salsa_nur: Bagus. Boleh saya tambah bagian tentang lokalisasi? Teks Inggris dan Indonesia tidak bisa diterjemahkan kata per kata.
putriayu: Boleh sekali Salsa, kita tulis bersama sebagai lanjutan.
komang_adi: Dari sisi backend, kami bisa mengirim kode error yang stabil supaya frontend bisa memilih pesan yang tepat, bukan menampilkan pesan mentah dari server.
sari_dewi: Setuju dengan Komang. Pesan untuk pengguna sebaiknya dimiliki frontend/desain, bukan string dari server.
