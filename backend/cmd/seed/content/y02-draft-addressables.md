---
title: Addressables vs Resources di Unity: Catatan Awal (Draft)
author: gedesurya
category: unity-vr
difficulty: intermediate
status: draft
age: 2
featured: false
cover: unsplash:1558346490-a72e53ae2d4f
---

> **Draft.** Masih mengumpulkan data ukuran build dan waktu loading dari proyek Quest kami.

Build Quest kami sudah menyentuh 1,4 GB dan waktu loading scene pertama terasa lama. Kak Bayu menyarankan saya mengevaluasi **Addressables** menggantikan folder `Resources/`.

![Papan sirkuit dengan komponen](unsplash:1558346490-a72e53ae2d4f)
*Resources memuat semuanya ke dalam build; Addressables memungkinkan memuat dan membuang aset secara terarah.*

## Masalah dengan Resources

- Semua isi folder `Resources/` ikut dalam build dan diindeks saat start-up, walau tidak dipakai.
- Tidak ada pelepasan aset yang terkelola secara eksplisit.
- Sulit memperbarui konten tanpa merilis ulang aplikasi.

## Yang saya rencanakan

1. Pindahkan aset besar (tekstur lingkungan, audio) ke grup Addressables.
2. Muat per scene dan lepas (`Addressables.Release`) saat berpindah.
3. Ukur: ukuran build, memori puncak, waktu loading scene pertama.

## Pertanyaan yang belum terjawab

- Bagaimana strategi grup agar bundle tidak terlalu kecil atau terlalu besar?
- Apakah konten remote berguna untuk Quest Store?
- Bagaimana menguji pelepasan memori dengan Profiler?

<!--comments-->
