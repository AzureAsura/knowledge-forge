---
title: Input System Baru di Unity: Dari Input.GetKey ke Action Maps dan Rebinding
author: fajarnug
category: unity-2d
difficulty: beginner
status: published
age: 15
featured: false
cover: unsplash:1493711662062-fa541adb3fc8
---

Dulu saya menulis kontrol seperti ini di setiap tutorial:

```csharp
if (Input.GetKeyDown(KeyCode.Space)) Jump();
float x = Input.GetAxisRaw("Horizontal");
```

Cepat, mudah, dan hanya jalan untuk keyboard. Begitu bos bilang "game ini harus bisa dimainkan dengan gamepad, dan pemain harus bisa mengubah tombol," saya sadar kode kontrolku tersebar di sepuluh skrip. Itulah alasan Unity punya **Input System** (paket `com.unity.inputsystem`), pengganti sistem `Input` lama.

Scroll ini adalah panduan pemula berdasarkan migrasi proyek platformer kami: apa itu Action Map, cara menghubungkannya ke kode, dan cara membuat rebinding sederhana.

![Dua tangan memegang gamepad di depan layar permainan](unsplash:1493711662062-fa541adb3fc8)
*Pemain tidak peduli tombol apa yang kamu pilih; mereka peduli bisa mengubahnya.*

## Ide besar: aksi, bukan tombol

Sistem lama bertanya "tombol apa yang sedang ditekan?". Sistem baru memisahkan **aksi** (apa yang ingin dilakukan: `Jump`, `Move`) dari **binding** (kontrol fisik yang memicunya: `Space`, `Gamepad South Button`, `Touch`).

| Konsep | Arti |
|---|---|
| **Input Actions asset** | File `.inputactions` yang menyimpan semuanya |
| **Action Map** | Kelompok aksi untuk satu konteks (`Gameplay`, `UI`) |
| **Action** | Satu hal yang bisa dilakukan (`Jump`, `Move`, `Fire`) |
| **Binding** | Hubungan aksi ke kontrol fisik |
| **Control Scheme** | Kumpulan perangkat (Keyboard+Mouse, Gamepad) |

Kodenya hanya peduli pada **aksi**. Menambah dukungan gamepad atau touch cukup menambah binding di aset, tanpa mengubah satu baris pun kode gameplay.

## Mengaktifkan paket

`Window → Package Manager → Unity Registry → Input System → Install`. Unity bertanya apakah ingin mengaktifkan backend baru dan me-restart editor; pilih Yes. Lalu cek `Project Settings → Player → Active Input Handling`: pilih **Input System Package (New)** atau **Both** saat transisi.

![Perangkat game retro](unsplash:1550745165-9bc0b252726f)
*Perangkat game retro.*

## Membuat Input Actions

`Assets → Create → Input Actions`, beri nama `PlayerControls`. Klik dua kali untuk membuka editor, lalu:

1. Buat Action Map `Gameplay`.
2. Tambah action `Move` dengan **Action Type: Value**, **Control Type: Vector2**.
   - Binding: **2D Vector Composite** → Up=`W`, Down=`S`, Left=`A`, Right=`D`; tambahkan binding `Left Stick [Gamepad]`.
3. Tambah action `Jump` dengan **Action Type: Button**.
   - Binding: `Space [Keyboard]` dan `Button South [Gamepad]`.
4. Centang **Generate C# Class** pada aset, sehingga muncul kelas `PlayerControls` bertipe aman.

## Menggunakan di kode: tiga cara

### Cara A: kelas C# yang dihasilkan (yang saya pakai)

```csharp
using UnityEngine;
using UnityEngine.InputSystem;

public class PlayerController : MonoBehaviour
{
    private PlayerControls controls;
    private Vector2 move;

    private void Awake()
    {
        controls = new PlayerControls();
        controls.Gameplay.Move.performed += ctx => move = ctx.ReadValue<Vector2>();
        controls.Gameplay.Move.canceled  += _   => move = Vector2.zero;
        controls.Gameplay.Jump.performed += _   => Jump();
    }

    private void OnEnable()  => controls.Gameplay.Enable();
    private void OnDisable() => controls.Gameplay.Disable();

    private void FixedUpdate() => rb.linearVelocity = new Vector2(move.x * speed, rb.linearVelocity.y);
    private void Jump() { /* ... */ }
}
```

Dua hal yang sering terlewat: **`Enable()` di `OnEnable` dan `Disable()` di `OnDisable`**, dan jangan lupa `canceled` untuk mereset nilai saat tombol dilepas (kalau tidak, karakter terus berjalan).

### Cara B: komponen `PlayerInput`

Tambahkan `PlayerInput` ke GameObject, pilih aset, dan setel *Behavior* ke `Send Messages` atau `Unity Events`. Metode seperti `OnMove(InputValue v)` dan `OnJump()` otomatis terpanggil. Cepat untuk prototipe dan sangat baik untuk **multiplayer lokal** (setiap `PlayerInput` mendapat perangkatnya sendiri).

### Cara C: polling

```csharp
var jump = controls.Gameplay.Jump;
if (jump.WasPressedThisFrame()) Jump();
float x = controls.Gameplay.Move.ReadValue<Vector2>().x;
```

Berguna jika kamu lebih nyaman gaya `Update` lama. `WasPressedThisFrame`, `IsPressed`, dan `WasReleasedThisFrame` setara `GetKeyDown`, `GetKey`, `GetKeyUp`.

## Kontrol yang terasa enak: interaksi

Binding bisa diberi **interaction** (cara aksi dipicu) dan **processor** (mengubah nilai):

| Fitur | Contoh pemakaian |
|---|---|
| `Press` (Press and Release) | memicu saat tombol ditekan/dilepas |
| `Hold` | isi daya lompatan atau tembakan |
| `Tap` / `MultiTap` | dash dengan dua ketukan |
| `Deadzone` processor | mengabaikan drift analog stick |
| `Invert` / `Scale` processor | membalik sumbu Y, sensitivitas |

Deadzone penting: stick analog murah jarang tepat 0,0 saat dilepas; tanpa deadzone karakter bergeser pelan sendiri.

## Rebinding: biarkan pemain mengubah tombol

Salah satu alasan terbesar pindah. Ini versi sederhana:

```csharp
public void StartRebind(InputAction action, int bindingIndex, Action onDone)
{
    action.Disable();
    action.PerformInteractiveRebinding(bindingIndex)
        .WithControlsExcluding("<Mouse>/position")
        .WithCancelingThrough("<Keyboard>/escape")
        .OnComplete(op =>
        {
            op.Dispose();
            action.Enable();
            Save(action);
            onDone?.Invoke();
        })
        .Start();
}

private void Save(InputAction action) =>
    PlayerPrefs.SetString("rebinds", action.actionMap.asset.SaveBindingOverridesAsJson());

public void Load(InputActionAsset asset)
{
    var json = PlayerPrefs.GetString("rebinds", null);
    if (!string.IsNullOrEmpty(json)) asset.LoadBindingOverridesFromJson(json);
}
```

Panggil `Load` saat game mulai. Hal yang harus dipikirkan: konflik (dua aksi ke tombol yang sama), tombol cadangan (`Escape` untuk membatalkan), dan menampilkan nama tombol aktual di UI dengan `action.GetBindingDisplayString()` sehingga petunjuk "Tekan [Space]" berubah mengikuti binding pemain.

## Beberapa Action Map: gameplay vs UI

Saat menu jeda terbuka, kontrol gameplay tidak boleh aktif. Pisahkan:

```csharp
public void OpenPauseMenu()
{
    controls.Gameplay.Disable();
    controls.UI.Enable();
    Time.timeScale = 0f;
}
```

Ini jauh lebih bersih daripada `if (isPaused) return;` di setiap skrip.

## Kesalahan yang saya buat

| Kesalahan | Gejala | Solusi |
|---|---|---|
| Lupa `Enable()` | Aksi tidak pernah terpicu | `OnEnable` → `Enable()` |
| Tidak menangani `canceled` | Karakter jalan terus | Reset nilai di `canceled` |
| Lupa melepas subscribe | Pemanggilan ke objek yang dihancurkan | Lepas di `OnDisable`/gunakan method, bukan lambda |
| Active Input Handling masih Old | `InputSystem` tidak ada efeknya | Ubah di Project Settings |
| Membaca di `FixedUpdate` dengan `WasPressedThisFrame` | Tekan terlewat | Baca di `Update`, simpan flag untuk fisika |

Poin terakhir sering membuat lompatan "kadang tidak terdaftar": `WasPressedThisFrame` benar hanya pada satu frame render, dan `FixedUpdate` mungkin tidak berjalan di frame itu.

## Ringkasan

- Kode memakai **aksi**, bukan tombol; binding ada di aset.
- Gunakan kelas C# yang dihasilkan, `Enable/Disable` pada lifecycle yang benar.
- Deadzone, Hold, dan Tap memberi rasa kontrol yang baik tanpa kode ekstra.
- Rebinding dan multi-perangkat hampir gratis begitu fondasinya benar.

Terima kasih untuk Kak Arief yang mengoreksi draf pertama saya.

Referensi: Unity Manual dan dokumentasi paket *Input System* (*Actions*, *Interactions*, *Rebinding*).

<!--comments-->
arief_s: Catatan terakhir tentang WasPressedThisFrame di FixedUpdate sangat berharga, Fajar. Itu penyebab bug 'lompat kadang tidak jalan' di banyak proyek.
fajarnug: Terima kasih Kak, saya ketemu bugnya persis begitu kemarin dan butuh tiga jam untuk sadar.
gedesurya: Rebinding sudah bisa disimpan per pemain? Kita mau tombol berbeda untuk mode VR dan desktop.
fajarnug: Bisa, JSON override-nya per aset. Kamu bisa menyimpan satu JSON per Control Scheme.
intanp: Untuk VR XR Interaction Toolkit juga memakai Input System yang sama. Jadi pelajaran ini langsung terpakai di sana.
bayu_w: Betul, action-based input di XRI memakai InputActionAsset yang sama dasarnya. Konsepnya sama.
