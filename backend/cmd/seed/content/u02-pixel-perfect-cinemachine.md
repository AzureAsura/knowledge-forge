---
title: Pixel Perfect Camera + Cinemachine: Mengakhiri Sprite Jitter dan Garis Tipis Antar Tile
author: arief_s
category: unity-2d
difficulty: intermediate
status: published
age: 84
featured: false
cover: unsplash:1550745165-9bc0b252726f
---

Kamu membuat game pixel art. Karakter terlihat bagus saat diam, tetapi begitu kamera mengikutinya, tile bergetar, sprite tampak "bergelombang", dan kadang muncul garis tipis berkedip di antara dua tile. Itu bukan bug di kodemu, tapi interaksi antara **posisi sub-pixel**, **skala kamera**, dan **filtering**.

Scroll ini menjelaskan penyebabnya dan menunjukkan konfigurasi yang kami pakai di proyek platformer Palm Studio: **Pixel Perfect Camera** (URP) digabung dengan **Cinemachine** dan beberapa pengaturan sprite. Setelah ini, pixel kamu diam di tempatnya.

![Konsol retro dan perangkat game lama di atas meja](unsplash:1550745165-9bc0b252726f)
*Pixel art butuh satu aturan sederhana: setiap pixel sprite harus jatuh tepat pada satu pixel layar.*

## Kenapa jitter terjadi

Bayangkan sprite 16×16 piksel di layar yang menampilkan game dengan resolusi referensi 320×180, lalu diskalakan ke jendela 1920×1080. Skalanya persis 6×, jadi satu pixel game = 6×6 pixel layar. Bagus.

Sekarang kamera bergerak 0,37 unit dunia. Posisi sprite di layar menjadi 2,22 pixel game → tidak jatuh di batas pixel. GPU harus **menginterpolasi**, dan pixel yang tadinya tajam sekarang terlihat seperti bergeser setengah pixel; karena kamera terus bergerak, pergeseran itu berubah tiap frame dan terlihat sebagai getaran.

Tiga sumber utama:

1. **Posisi kamera tidak ter-snap** ke grid pixel.
2. **Resolusi/skala tidak kelipatan bilangan bulat**: misal 1080p ke 320×180 = 6×, aman; tetapi 1366×768 = 4,27×, tidak aman.
3. **Filter bilinear** pada tekstur yang mencampur pixel tetangga.

## Pengaturan sprite (dasar)

Sebelum menyentuh kamera, pastikan setiap tekstur pixel art memakai:

| Pengaturan | Nilai |
|---|---|
| Filter Mode | Point (no filter) |
| Compression | None |
| Pixels Per Unit | Seragam (misal 16) untuk semua aset |
| Mesh Type | Tight → **Full Rect** untuk tile |
| Generate Mip Maps | Off |

PPU yang tidak seragam membuat sebagian sprite punya "pixel" yang ukurannya berbeda, dan Pixel Perfect Camera tidak bisa menyelaraskannya sekaligus.

![Gerbang kastil berkabut, referensi suasana level](unsplash:1518709268805-4e9042af9f23)
*Gerbang kastil berkabut, referensi suasana level.*

## Pixel Perfect Camera (URP)

Di Unity 6 dengan URP, komponen **Pixel Perfect Camera** sudah bawaan (`2D Renderer`). Tambahkan ke GameObject kamera utama.

| Properti | Isi | Catatan |
|---|---|---|
| Assets Pixels Per Unit | 16 | harus sama dengan PPU sprite |
| Reference Resolution | 320 × 180 | resolusi "game" yang kamu desain |
| Upscale Render Texture | Off (awal) | aktifkan jika ingin render ke tekstur kecil lalu upscale |
| Pixel Snapping | On | **snap sprite ke grid pixel** (menghilangkan jitter sprite) |
| Crop Frame | None / Letterbox / Pillarbox | cara menangani aspek rasio |
| Stretch Fill | Off | mempertahankan skala bilangan bulat |

Komponen ini menghitung **ukuran orthographic** kamera sehingga setiap pixel game selalu jatuh pada kelipatan bulat pixel layar. Di panel *Game view*, kamu bisa melihat catatan "Pixel Perfect Camera: running" dan skala yang dipakai.

Hal penting: **jangan** mengatur `Orthographic Size` kamera secara manual lagi; komponen ini akan menimpanya setiap frame.

## Cinemachine: mengikuti tanpa merusak snap

Kita tetap butuh kamera yang mulus mengikuti pemain. Gunakan **Cinemachine** (paket `com.unity.cinemachine`). Buat `Cinemachine Camera` (di Unity 6, nama lama *Virtual Camera*), setel *Tracking Target* ke pemain, dan tambahkan komponen **Cinemachine Pixel Perfect** (extension) pada kamera virtual itu.

Extension ini memberi tahu Cinemachine untuk memakai pengaturan Pixel Perfect Camera ketika menghitung ukuran dan posisi akhir, sehingga gerak halus Cinemachine tetap dibulatkan ke grid pixel pada akhirnya.

Konfigurasi yang kami pakai untuk platformer:

| Komponen | Pengaturan | Efek |
|---|---|---|
| Position Composer / Follow | Damping X 0,6, Y 0,9 | gerak mengikuti halus |
| Dead Zone | Lebar 0,1, tinggi 0,2 | kamera tidak bereaksi pada gerakan kecil |
| Look-ahead | Time 0,25 | kamera sedikit mendahului arah gerak |
| Cinemachine Pixel Perfect | On | snap di akhir pipeline |
| Confiner 2D | Collider batas level | kamera tidak keluar peta |

> Urutan pipeline: Cinemachine menghitung posisi → Pixel Perfect extension membulatkan → kamera merender.

## Garis tipis di antara tile (tile bleeding)

Masalah yang sering muncul bersamaan: garis tipis kelap-kelip di sambungan tile. Penyebabnya, sampling tekstur di tepi sprite menarik pixel dari tetangganya di atlas. Solusi bertingkat:

1. **Pixel Perfect Camera + Point filter** (sudah menyelesaikan sebagian besar).
2. **Sprite Atlas** dengan **Padding** ≥ 2 pixel dan *Tight Packing* mati untuk tileset.
3. Pada Sprite Atlas, matikan *Allow Rotation*.
4. Jika tile masih bocor, ubah **Sprite Mode / Mesh Type = Full Rect** pada tile sheet.
5. Untuk Tilemap Renderer, atur **Mode: Chunk** (default); mode *Individual* lebih rawan celah.

## Rigidbody dan interpolasi

Jitter juga muncul dari **fisika**: `FixedUpdate` berjalan pada 50 Hz, sedangkan render pada 60+ Hz. Karakter berpindah pada langkah tetap, sementara kamera bergerak per frame, sehingga jarak di antara keduanya berosilasi.

Setel di `Rigidbody2D` pemain: **Interpolate = Interpolate**. Kamera yang mengikuti objek yang diinterpolasi menjadi mulus tanpa jitter. Mengikuti objek tanpa interpolasi adalah penyebab paling umum jitter yang "tidak hilang walau Pixel Perfect sudah aktif".

```csharp
// Hindari: menggerakkan kamera/target dengan transform di Update
// sambil memakai Rigidbody2D untuk fisika.
private void FixedUpdate()
{
    rb.linearVelocity = new Vector2(input.x * speed, rb.linearVelocity.y);
}
```

Perhatikan: di Unity 6, `Rigidbody2D.velocity` berganti nama menjadi `linearVelocity`.

## Resolusi dan letterbox

Pilih resolusi referensi yang membagi resolusi umum dengan rapi:

| Reference | 1920×1080 | 2560×1440 | 3840×2160 |
|---|---|---|---|
| 320×180 | 6× | 8× | 12× |
| 480×270 | 4× | tidak bulat | 8× |
| 384×216 | 5× | tidak bulat | 10× |

Resolusi seperti 1366×768 atau layar ultrawide tidak akan kelipatan bulat; di situ pilih **Crop Frame: Letterbox/Pillarbox** supaya Unity menambahkan batas hitam daripada meregangkan pixel menjadi tidak rata.

## Checklist debugging

1. Apakah semua sprite memakai Point filter dan PPU yang sama?
2. Apakah Pixel Perfect Camera aktif dan PPU-nya cocok dengan aset?
3. Apakah ada kode yang menyetel `orthographicSize` kamera?
4. Apakah target kamera menggunakan Rigidbody2D **Interpolate**?
5. Apakah Cinemachine Pixel Perfect extension terpasang pada kamera virtual?
6. Apakah Sprite Atlas punya padding?
7. Uji pada skala bukan bilangan bulat, lihat apakah Letterbox/Pillarbox bekerja.

## Penutup

Jitter pixel art hampir selalu soal **konsistensi**: satu PPU, satu filter, satu sumber kebenaran untuk ukuran kamera, dan satu langkah pembulatan di akhir. Begitu semuanya sejalan, kamera boleh mulus dan pixel tetap tajam.

Referensi: Unity Manual (*Pixel Perfect Camera for URP*, *Preparing sprites for pixel perfect*, *Cinemachine Pixel Perfect extension*).

<!--comments-->
fajarnug: Interpolate di Rigidbody2D ternyata kuncinya. Saya sudah pasang Pixel Perfect Camera tapi jitter tetap ada sampai membaca bagian itu.
arief_s: Pola klasik, Fajar. Pixel Perfect hanya menyelesaikan sisi render. Kalau targetnya melompat pada langkah fisika, kamera tetap melihat getaran.
gedesurya: Di Unity 6 ada perubahan velocity jadi linearVelocity ya? Kodeku masih memakai velocity dan muncul peringatan.
arief_s: Betul. Nama lama masih jalan lewat warning, tapi sebaiknya pindah ke linearVelocity.
intanp: Tabel kelipatan resolusinya praktis. Saya pernah memakai 480x270 dan bingung kenapa 1440p buram.
dewilestari: Meski bukan game dev, saya penasaran: padding di Sprite Atlas itu sama dengan konsep bleed di sprite CSS?
arief_s: Mirip sekali, Dewi. Sama-sama ruang aman di tepi supaya sampling tidak menarik pixel tetangga.
