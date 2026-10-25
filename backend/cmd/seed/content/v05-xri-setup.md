---
title: Setup XR Interaction Toolkit dari Nol: Dari Proyek Kosong ke Grab Objek di Quest
author: intanp
category: unity-vr
difficulty: beginner
status: published
age: 27
featured: false
cover: unsplash:1593508512255-86ab42a8e620
---

Banyak tutorial VR melewatkan 20 menit pertama, bagian yang paling membingungkan: proyek kosong, paket mana yang dipasang, kenapa layar hitam di headset, dan kenapa tangan tidak muncul. Scroll ini adalah checklist yang saya buat setelah tiga kali membuat proyek VR dari nol dan tiga kali melakukan kesalahan yang sama.

Hasil akhirnya: proyek Unity 6 dengan **XR Interaction Toolkit (XRI)** dan OpenXR, yang bisa di-build ke Meta Quest, memiliki dua controller, dan memungkinkan pemain mengambil serta melempar sebuah kubus.

![Pemain memakai headset VR sambil memegang controller](unsplash:1535223289827-42f1e9919769)
*Tujuan akhir: kamu memakai headset, melihat tanganmu, dan mengambil objek pertama.*

## Prasyarat

- Unity 6 (6000.x) dengan modul **Android Build Support** (termasuk OpenJDK dan Android SDK).
- Meta Quest 2/3/Pro dengan **Developer Mode** aktif (lewat aplikasi Meta Horizon di ponsel) dan kabel USB-C.
- Kabel dikenali: `adb devices` menampilkan perangkat (headset menanyakan "Allow USB debugging" → izinkan).

## Langkah 1: buat proyek dan ganti platform

1. Buat proyek **3D (URP)**.
2. `File → Build Profiles` → pilih **Android** → *Switch Platform*. (Quest adalah perangkat Android.)
3. Di *Texture Compression* pilih **ASTC**.

Mengganti platform bisa memakan beberapa menit karena Unity mengimpor ulang aset.

![Headset VR putih](unsplash:1622979135225-d2ba269cf1ac)
*Headset VR putih.*

## Langkah 2: pasang paket

`Window → Package Manager → Unity Registry`:

| Paket | Fungsi |
|---|---|
| **XR Plugin Management** | Mengelola runtime XR |
| **OpenXR Plugin** | Backend standar |
| **XR Interaction Toolkit** | Komponen interaksi siap pakai |
| **XR Hands** (opsional) | Hand tracking |
| **Input System** | Biasanya terpasang bersama XRI |

Saat XRI dipasang, ada tombol untuk mengimpor **Starter Assets** di tab *Samples*. **Impor ini**: berisi preset action, prefab controller, dan konfigurasi yang menghemat banyak waktu.

## Langkah 3: aktifkan OpenXR untuk Android

`Edit → Project Settings → XR Plug-in Management`:

1. Tab **Android**: centang **OpenXR**.
2. Di `OpenXR`, tambahkan **Interaction Profiles**: *Oculus Touch Controller Profile* (dan *Meta Quest Touch Pro* bila perlu).
3. Di *OpenXR Feature Groups*, aktifkan **Meta Quest Support**.
4. Klik tanda seru kuning pada *Project Validation* (`XR Plug-in Management → Project Validation`) dan tekan **Fix All**. Ini memperbaiki banyak hal (Color Space Linear, Graphics API Vulkan/GLES3, dan lain-lain).

Kesalahan umum: lupa mencentang OpenXR di tab **Android** (bukan tab PC). Hasilnya app berjalan tapi layar tidak menampilkan apa-apa.

## Langkah 4: XR Origin

Hapus `Main Camera` bawaan. Tambahkan `GameObject → XR → XR Origin (VR)`. Objek ini berisi:

```
XR Origin (VR)
├── Camera Offset
│   ├── Main Camera       (TrackedPoseDriver, kepala)
│   ├── Left Controller   (XR Controller / pose)
│   └── Right Controller
```

Tambahkan juga `GameObject → XR → Interaction Manager` (jika belum ada) dan `EventSystem` dengan **XR UI Input Module** bila memakai UI.

Pada XR Origin, setel **Tracking Origin Mode** ke **Floor** (pemain berdiri) atau **Device** (duduk, tinggi tetap). Jika pemain tampak tenggelam di lantai atau melayang, ini pengaturan pertama yang diperiksa.

## Langkah 5: dunia sederhana

Buat `Plane` sebagai lantai (skala 5) dan beri collider. Letakkan sebuah `Cube` setinggi pinggang (y = 1) dengan skala 0,2.

## Langkah 6: membuat kubus bisa diambil

Pilih Cube dan tambahkan:

1. **Rigidbody** (Use Gravity aktif).
2. **XR Grab Interactable**.
   - *Movement Type*: **Velocity Tracking** untuk objek yang melempar/menabrak dengan natural; *Instantaneous* untuk menempel tanpa jeda.
   - *Throw On Detach*: aktif supaya objek bisa dilempar.

Pada kedua controller, tambahkan **XR Direct Interactor** (untuk menjangkau dekat) dengan collider sphere trigger kecil (radius 0,1), dan **XR Ray Interactor** (jarak jauh) bila diinginkan. Starter Assets menyediakan prefab `Left/Right Controller` yang sudah lengkap, jadi cukup gunakan itu.

Hubungkan **Input Action** agar tombol grip memicu *Select* dan trigger memicu *Activate*. Preset di Starter Assets (`XRI Default Input Actions`) sudah dikonfigurasi.

## Langkah 7: build dan jalankan

1. `File → Build Profiles → Android → Build And Run` (headset terhubung USB).
2. Pastikan *Minimum API Level* ≥ 29 dan *Scripting Backend* **IL2CPP** dengan arsitektur **ARM64**.
3. Beri nama paket unik: `com.palmstudio.vrsandbox`.

Setelah terpasang, buka aplikasi dari **Unknown Sources** di library Quest.

## Daftar masalah dan solusinya

| Gejala | Penyebab biasa | Solusi |
|---|---|---|
| Layar hitam di headset | OpenXR tidak dicentang di tab Android | Aktifkan OpenXR + Meta Quest Support |
| Tangan/controller tidak muncul | Interaction profile belum ditambahkan | Tambah Oculus Touch Controller Profile |
| Controller muncul tetapi tidak bisa mengambil | Tidak ada Interaction Manager atau layer tidak cocok | Tambah Interaction Manager; cek Interaction Layer Mask |
| Pemain tenggelam di lantai | Tracking Origin Mode salah | Floor vs Device |
| Objek jatuh menembus lantai | Collider tidak ada | Tambah collider pada lantai |
| Build gagal "Gradle" | JDK/SDK tidak terpasang dari Unity Hub | Pasang modul Android Build Support lengkap |
| Frame rate rendah | Pengaturan grafis desktop | Gunakan URP preset Mobile; matikan post-processing |
| `adb devices` kosong | Developer Mode atau izin USB debugging | Aktifkan di aplikasi Meta, izinkan di headset |

## Pengaturan kualitas awal (URP)

Untuk Quest, mulai dari preset yang ringan:

- Anti-aliasing **MSAA 4×**, tanpa post-processing berat.
- Real-time shadow minimal atau matikan; bake lighting.
- Render Scale 1.0, **Fixed Foveated Rendering** Medium/High (lihat scroll *Profiling Quest Builds* oleh Kak Bayu).
- Color Space **Linear**, Graphics API **Vulkan** atau OpenGLES3 sesuai dukungan.

## Langkah berikutnya

- Tambah **locomotion** (Teleportation Provider + Snap Turn) dan vignette; lihat scroll locomotion.
- Tambah **hand tracking** (paket XR Hands) bila diinginkan.
- Buat **UI World Space** dan uji jarak serta ukuran teks.
- Siapkan profil kenyamanan sejak awal.

## Pesan terakhir

Tiga hal yang saya harap saya tahu di hari pertama: impor *Starter Assets* dulu, jalankan **Project Validation → Fix All**, dan uji build ke headset sedini mungkin. Simulator di editor berguna, tapi masalah nyata (izin, orientasi, performa) hanya muncul di perangkat.

Referensi: dokumentasi Unity XR Interaction Toolkit (*Get started*), Meta Horizon (*Unity Development Overview*), spesifikasi OpenXR.

<!--comments-->
bayu_w: Checklist yang rapi, Intan. Satu tambahan: aktifkan juga "Meta XR Feature: Late Latching/Space Warp" hanya jika diperlukan, jangan default. Selebihnya persis seperti yang kami lakukan di proyek baru.
intanp: Terima kasih Kak Bayu! Saya tambahkan catatan itu di revisi berikutnya.
gedesurya: Bagian tabel masalah dan solusinya sangat membantu. Saya mengalami layar hitam dan ternyata OpenXR hanya dicentang di tab PC.
rizkymaul: Sebagai yang belum pernah menyentuh VR: apakah XRI mendukung testing tanpa headset?
intanp: Ada XR Device Simulator di Starter Assets. Kamu bisa menggerakkan kepala dan tangan dengan keyboard dan mouse, cukup untuk uji interaksi dasar.
arief_s: Gunakan Input System yang sama dengan scroll Fajar. XRI action-based memakai asset yang sama konsepnya.
