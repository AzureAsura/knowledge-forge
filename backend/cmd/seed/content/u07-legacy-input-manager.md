---
title: Dasar Input Manager Lama di Unity: GetAxis dan GetButton (Sudah Tidak Dipakai)
author: fajarnug
category: unity-2d
difficulty: beginner
status: archived
age: 100
featured: false
cover: unsplash:1550745165-9bc0b252726f
---

> **Catatan arsip:** scroll ini menjelaskan sistem `Input` lama. Tim sudah pindah ke Input System baru; lihat scroll *Input System Baru di Unity*. Scroll ini dipertahankan hanya sebagai referensi untuk proyek lama.

Sebelum paket Input System ada, semua input di Unity melewati kelas statis `Input`. Panduan singkat ini merangkum cara kerjanya, karena beberapa proyek lama kita masih memakainya.

![Perangkat retro di atas meja](unsplash:1550745165-9bc0b252726f)
*Sistem lama sederhana, tetapi terikat pada nama tombol yang ditulis sebagai string.*

## Input Manager

`Edit → Project Settings → Input Manager` berisi daftar *axis* bernama, misalnya `Horizontal`, `Vertical`, `Jump`, dan `Fire1`. Setiap axis punya tombol positif/negatif, gravity, sensitivity, dan dead zone.

| Properti | Arti |
|---|---|
| Positive/Negative Button | Tombol yang menggerakkan nilai ke +1 / −1 |
| Gravity | Seberapa cepat nilai kembali ke 0 saat dilepas |
| Sensitivity | Seberapa cepat nilai mencapai ±1 |
| Dead | Zona mati joystick |
| Snap | Langsung balik arah saat tombol berlawanan ditekan |

## Membaca input

```csharp
void Update()
{
    float x = Input.GetAxisRaw("Horizontal");   // -1, 0, atau 1 tanpa smoothing
    float smooth = Input.GetAxis("Horizontal"); // dengan smoothing

    if (Input.GetButtonDown("Jump")) Jump();
    if (Input.GetKeyDown(KeyCode.E)) Interact();
}
```

- `GetAxis` mengembalikan nilai yang dihaluskan (sesuai gravity/sensitivity).
- `GetAxisRaw` mengembalikan nilai mentah; lebih cocok untuk game pixel art yang butuh respons instan.
- `GetButtonDown` benar hanya satu frame saat ditekan; `GetButton` selama ditahan; `GetButtonUp` saat dilepas.

![Gerbang kastil berkabut, referensi suasana level](unsplash:1518709268805-4e9042af9f23)
*Gerbang kastil berkabut, referensi suasana level.*

## Kenapa kita meninggalkannya

1. Binding hanya bisa diubah lewat launcher, bukan oleh pemain di dalam game.
2. Nama axis berupa string, rawan salah ketik tanpa peringatan compile.
3. Dukungan gamepad lintas platform tidak konsisten.
4. Tidak mendukung beberapa pemain lokal dengan perangkat berbeda dengan baik.
5. Unity tidak lagi mengembangkannya; fitur baru hanya masuk ke Input System.

Untuk proyek baru, gunakan Input System. Untuk memelihara proyek lama, pastikan `Active Input Handling` diatur ke *Both* sebelum memigrasi sedikit demi sedikit.

<!--comments-->
