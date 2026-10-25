---
title: Tilemap dan Rule Tile di Unity: Membangun Level Platformer dalam Sehari
author: arief_s
category: unity-2d
difficulty: beginner
status: published
age: 108
featured: true
cover: unsplash:1511512578047-dfb367046420
---

Level 2D yang dibuat dengan menaruh ratusan `SpriteRenderer` satu per satu adalah resep untuk dua masalah: draw call membengkak dan kamu kehilangan akal sehat di Scene view. Unity punya sistem yang dirancang persis untuk ini: **Tilemap**. Dikombinasikan dengan **Rule Tile**, kamu bisa melukis level dengan kuas, dan tepi, sudut, serta lantai memilih sprite yang tepat secara otomatis.

Scroll ini membimbing dari proyek kosong sampai level platformer yang bisa dimainkan, dengan fokus pada hal yang sering membuat pemula tersandung: pengaturan sprite, urutan layer, dan collider yang tidak membuat karakter "nyangkut" di sambungan antar tile.

![Mesin arcade dengan layar neon di ruangan gelap](unsplash:1511512578047-dfb367046420)
*Game 2D klasik dibangun dari grid. Tilemap adalah grid itu, dengan alat lukis.*

## Prasyarat

- Unity 6 (6000.x) dengan template **2D (URP)**. Template 2D sudah memasang paket *2D Tilemap Editor*; kita juga butuh *2D Tilemap Extras* (Package Manager → Unity Registry) untuk Rule Tile.
- Satu sprite sheet tileset. Pixel art 16×16 atau 32×32 per tile ideal. Banyak tileset gratis di itch.io dan OpenGameArt.

## Langkah 1: siapkan sprite sheet

Impor gambar tileset ke `Assets/Art/Tilesets/`. Di Inspector, setel:

| Pengaturan | Nilai | Alasan |
|---|---|---|
| Texture Type | Sprite (2D and UI) | Wajib |
| Sprite Mode | **Multiple** | Satu file berisi banyak tile |
| Pixels Per Unit | Sama dengan ukuran tile (16 atau 32) | 1 tile = 1 unit dunia |
| Filter Mode | **Point (no filter)** | Menjaga pixel tetap tajam |
| Compression | None | Menghindari artefak di pixel art |

Buka **Sprite Editor → Slice → Grid By Cell Size**, isi ukuran tile (misal 16×16), tekan *Slice*, lalu *Apply*. Setiap tile sekarang menjadi sprite terpisah.

> Kesalahan nomor satu pemula: Filter Mode masih Bilinear. Hasilnya tile terlihat buram dan ada garis tipis di antara tile saat kamera bergerak.

![Perangkat game retro](unsplash:1550745165-9bc0b252726f)
*Perangkat game retro.*

## Langkah 2: buat Grid dan Tilemap

`GameObject → 2D Object → Tilemap → Rectangular`. Unity membuat objek `Grid` dengan satu anak `Tilemap`. Ganti nama anak itu menjadi `Ground`.

Buat tiga Tilemap terpisah sebagai anak `Grid`, urut dari belakang ke depan:

| Tilemap | Sorting Layer / Order | Fungsi |
|---|---|---|
| `Background` | Background / 0 | dekorasi jauh, tanpa collider |
| `Ground` | Ground / 0 | lantai, dinding, platform (collider) |
| `Foreground` | Foreground / 0 | rumput depan karakter, tanpa collider |

Memisahkan tilemap berdasarkan fungsi membuat kamu bisa memberi collider hanya pada `Ground` dan mengatur urutan gambar dengan benar.

## Langkah 3: Tile Palette

Buka `Window → 2D → Tile Palette`. Buat palette baru (`Create New Palette`), simpan di `Assets/Art/Palettes/`. **Seret sprite sheet** yang sudah di-slice ke jendela palette; Unity meminta folder tujuan untuk membuat Tile asset (satu per sprite). Sekarang kamu bisa memilih tile dari palette dan melukisnya di Scene view dengan kuas (`B`), mengisi area (`G`), atau menghapus (`Shift` + klik).

Di bagian atas jendela, pastikan **Active Tilemap** diarahkan ke tilemap yang benar (misal `Ground`). Banyak "kenapa tile saya muncul di layer yang salah" berakar di sini.

## Langkah 4: Rule Tile, otomatisasi tepi dan sudut

Melukis tiap sudut dan tepi dengan tangan itu lambat dan rawan salah. **Rule Tile** memilih sprite berdasarkan tetangganya.

`Assets → Create → 2D → Tiles → Rule Tile`. Di Inspector:

1. Setel **Default Sprite** ke tile tengah (isi tanah).
2. Tambah aturan dengan `+` di *Tiling Rules*. Untuk tiap aturan, pilih sprite dan klik kotak 3×3 untuk menentukan syarat tetangga:
   - **Hijau (panah)**: tile ini harus ada di posisi itu.
   - **Merah (silang)**: tidak boleh ada tile di posisi itu.
   - **Kosong**: tidak peduli.

Contoh aturan untuk platform tanah dengan rumput:

| Aturan | Atas | Bawah | Kiri | Kanan | Sprite |
|---|---|---|---|---|---|
| Rumput tengah | ✗ | ✓ | ✓ | ✓ | `grass_top` |
| Rumput sudut kiri | ✗ | ✓ | ✗ | ✓ | `grass_top_left` |
| Rumput sudut kanan | ✗ | ✓ | ✓ | ✗ | `grass_top_right` |
| Isi tanah | ✓ | ✓ | ✓ | ✓ | `dirt` |
| Dinding kiri | ✓ | ✓ | ✗ | ✓ | `dirt_left` |

Urutan aturan penting: Unity memeriksa dari atas ke bawah dan memakai yang **pertama cocok**. Letakkan aturan yang paling spesifik di atas, aturan umum di bawah.

Setelah selesai, gunakan Rule Tile itu di palette. Sekarang melukis satu blok persegi menghasilkan platform dengan rumput di atas dan sudut yang benar tanpa kamu memilih apa pun satu per satu.

## Langkah 5: collider yang tidak membuat nyangkut

Pilih `Ground`, `Add Component → Tilemap Collider 2D`. Masalah klasik muncul: karakter yang berjalan di atas lantai kadang tersangkut di sambungan antar tile. Penyebabnya, setiap tile punya collider kotaknya sendiri, dan tepi dua kotak yang bersebelahan bisa menyebabkan "ghost collision".

Solusi dua komponen:

1. Centang **Use Composite** di Tilemap Collider 2D.
2. Tambahkan `Composite Collider 2D` (Unity otomatis menambahkan `Rigidbody 2D`; setel **Body Type: Static**).

Composite Collider menggabungkan semua tile bertetangga menjadi satu bentuk kontinu, jadi sambungan antar tile hilang.

```csharp
// Contoh: karakter tidak boleh nyangkut, dan lantai dikenali lewat layer.
[SerializeField] private LayerMask groundLayer;
[SerializeField] private Transform groundCheck;

private bool IsGrounded() =>
    Physics2D.OverlapCircle(groundCheck.position, 0.1f, groundLayer);
```

Pastikan `Ground` berada pada Layer `Ground` (bukan Default) dan `groundLayer` di skrip diisi layer itu.

## Langkah 6: menimpa tile lewat skrip

Kadang kamu perlu mengubah tile saat game berjalan: pintu terbuka, jembatan runtuh, blok bisa dihancurkan.

```csharp
using UnityEngine;
using UnityEngine.Tilemaps;

public class BreakableBlocks : MonoBehaviour
{
    [SerializeField] private Tilemap tilemap;

    // Dipanggil saat peluru mengenai posisi dunia tertentu
    public void BreakAt(Vector2 worldPoint)
    {
        Vector3Int cell = tilemap.WorldToCell(worldPoint);
        if (tilemap.HasTile(cell))
        {
            tilemap.SetTile(cell, null);   // hapus tile
        }
    }
}
```

Dengan `Composite Collider 2D`, mengubah tile di runtime otomatis memperbarui collider gabungannya.

## Performa

- Satu Tilemap dirender sebagai satu "chunk" dengan batching efisien. Jauh lebih murah daripada ratusan GameObject.
- Gunakan **Sprite Atlas** (atau opsi *Create Atlas* pada Tile Set di Unity 6) agar semua tile berada dalam satu tekstur dan draw call tidak naik.
- Hindari `Tilemap` raksasa yang sebagian besar kosong; bagi menjadi beberapa tilemap per area kalau levelnya sangat luas.

## Checklist hasil akhir

- [ ] Sprite sheet: Multiple, Point filter, PPU sesuai ukuran tile.
- [ ] Tiga tilemap (Background, Ground, Foreground) dengan Sorting Layer benar.
- [ ] Rule Tile dengan aturan spesifik di atas, umum di bawah.
- [ ] `Ground` memakai Tilemap Collider 2D + Composite + Rigidbody 2D Static.
- [ ] Karakter berjalan mulus tanpa nyangkut; tile bisa dilukis tanpa memilih satu-satu.

## Penutup

Kamu bisa menyelesaikan level pertama dalam satu hari bukan karena kamu cepat melukis, tapi karena alatnya menyingkirkan pekerjaan berulang: Rule Tile memilih sprite, Composite Collider menyatukan collider, dan Tilemap menyatukan draw call. Langkah berikutnya: tambahkan kamera yang stabil tanpa jitter (lihat scroll *Pixel Perfect Camera + Cinemachine*).

Referensi: Unity Manual (*Tilemaps*, *Tilemap Collider 2D*, paket *2D Tilemap Extras*) dan dokumentasi Unity 6 untuk Rule Tile.

<!--comments-->
fajarnug: Kak Arief, bagian Composite Collider menyelamatkan saya. Karakter saya selalu nyangkut di sambungan tile dan saya kira bug fisika.
arief_s: Itu ghost collision klasik, Fajar. Hampir semua orang mengalaminya sekali. Setelah composite, lantai jadi satu bentuk dan masalahnya hilang.
gedesurya: Saya masih bingung urutan aturan di Rule Tile. Kalau dua aturan sama-sama cocok, mana yang menang?
arief_s: Yang pertama dari atas. Karena itu aturan paling spesifik (banyak syarat) harus di atas dan aturan umum di bawah, seperti blok if-else.
intanp: Apakah Rule Tile bisa dipakai juga di VR 2.5D dengan tilemap yang dirender di plane?
arief_s: Bisa, Rule Tile hanya aturan pemilih sprite. Yang berbeda hanya cara kamera/plane merendernya.
rizkymaul: Dari yang bukan game dev: saya baru tahu Tilemap itu satu draw call. Pantas performanya jauh lebih baik daripada ratusan objek.
