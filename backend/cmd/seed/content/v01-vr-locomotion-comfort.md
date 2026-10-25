---
title: Locomotion di VR: Teleport, Snap Turn, dan Vignette yang Tidak Bikin Mual
author: bayu_w
category: unity-vr
difficulty: intermediate
status: published
age: 100
featured: true
cover: unsplash:1593508512255-86ab42a8e620
---

Di VR, ada satu bug yang tidak muncul di log mana pun: **pemain merasa mual dan melepas headset**. Tidak ada crash, tidak ada exception, hanya pengguna yang tidak kembali. Penyebab utamanya hampir selalu locomotion, cara kita menggerakkan pemain di dunia virtual.

Scroll ini merangkum hal-hal yang kami pelajari dari tiga proyek Quest di Palm Studio: kenapa mual terjadi, pilihan locomotion yang tersedia, nilai setelan yang aman, dan cara menerapkannya di Unity dengan XR Interaction Toolkit. Panduannya mengikuti rekomendasi resmi Meta tentang kenyamanan.

![Pemain memakai headset VR dan memegang controller](unsplash:1593508512255-86ab42a8e620)
*Mata melihat gerak, telinga bagian dalam merasa diam. Otak membaca konflik itu sebagai tanda keracunan.*

## Kenapa VR membuat mual

Penyebab klasiknya adalah **konflik sensorik**. Penglihatan memberi tahu otak bahwa tubuh bergerak (*vection*), sementara sistem vestibular di telinga dalam melaporkan bahwa tubuh diam. Kondisi yang paling memicu:

| Pemicu | Contoh |
|---|---|
| Akselerasi virtual yang tidak dirasakan tubuh | Mulai/berhenti berlari dengan analog stick |
| Rotasi kamera yang bukan dari kepala pemain | Smooth turn dengan stick |
| Frame rate rendah atau tidak konsisten | Drop dari 90 ke 60 fps |
| Latency antara gerak kepala dan gambar | Pipeline render lambat |
| Medan visual yang bergerak di pinggir pandangan | Lantai bermotif padat saat bergerak |

Kabar baiknya: sebagian besar bisa dikendalikan oleh desain.

## Lima teknik locomotion

| Teknik | Cara kerja | Kenyamanan | Catatan |
|---|---|---|---|
| **Teleport** | Pemain menunjuk titik, lalu pindah seketika (atau dengan blink) | ★★★★★ | Aman untuk pemula; mengurangi imersi |
| **Snap turn** | Putar kamera 30–45° sekali tekan | ★★★★☆ | Hapus rotasi kontinu |
| **Smooth locomotion** | Bergerak kontinu dengan stick | ★★☆☆☆ | Butuh opsi kenyamanan |
| **Smooth turn** | Putar kamera kontinu | ★★☆☆☆ | Salah satu pemicu terbesar; jadikan opt-in |
| **Physical movement** | Berjalan nyata di ruang bermain | ★★★★★ | Terbatas ukuran ruangan |

Prinsip dari panduan Meta: sediakan **teleport dan snap turn sebagai default** untuk pemain baru, dan tawarkan smooth locomotion/turn sebagai opsi yang bisa diaktifkan, dengan pengaturan kenyamanan yang dapat dikustomisasi.

![Headset VR putih](unsplash:1622979135225-d2ba269cf1ac)
*Headset VR putih.*

## Aturan emas: jangan pernah mengambil alih kamera

Gerakan kepala pemain harus **selalu** diterjemahkan 1:1 ke kamera. Jangan:

- menggoyang kamera (*head bob*) saat berjalan;
- memutar kamera dalam cutscene tanpa kendali pemain;
- memaksa pemain jatuh, berguling, atau terguncang.

Kalau butuh dampak ledakan, gunakan efek **non-kamera**: flash layar, suara, dan haptic controller.

## Vignette: mempersempit pandangan saat bergerak

Vignette (komfort tunnel) menggelapkan tepi layar saat pemain bergerak atau berputar. Medan visual pinggir, yang paling sensitif terhadap gerak, disembunyikan, sehingga vection berkurang.

Implementasi dengan XR Interaction Toolkit:

1. Tambahkan komponen **Tunneling Vignette Controller** ke XR Origin (kamera).
2. Hubungkan **Locomotion Providers** (move, turn) ke controller itu.
3. Atur parameter:

| Parameter | Nilai awal | Arti |
|---|---|---|
| Aperture Size | 0,7 → 0,4 saat bergerak | seberapa lebar area jernih |
| Feathering Effect | 0,2 | kelembutan tepi |
| Easing In/Out Time | 0,3 / 0,3 detik | transisi masuk/keluar |
| Smooth Turn Aperture | 0,5 | ukuran saat berputar |

Mulai dari aperture 0,4–0,6 saat bergerak (sesuai rentang umum pada panduan XR) dan biarkan pemain mengurangi atau mematikannya. Mulus: **vignette harus memudar halus**, bukan tiba-tiba, karena perubahan mendadak itu sendiri mengganggu.

## Kecepatan dan akselerasi

- Samakan kecepatan avatar dengan kecepatan nyata: jalan ≈ 1,4 m/s, lari ≈ 3–4 m/s. Kecepatan di atas 4–6 m/s hampir pasti membuat sebagian orang mual.
- **Hilangkan akselerasi bertahap.** Gunakan *quantized velocity*: pemain langsung berada pada kecepatan tetap (berhenti, jalan, lari) tanpa fase percepatan. Fase akselerasi adalah pemicu terbesar konflik sensorik.
- Akselerasi harus singkat dan jarang. Jangan membuat level yang butuh kecepatan berubah terus.

```csharp
// Kecepatan terkuantisasi: tanpa ramp up
public class QuantizedMove : MonoBehaviour
{
    [SerializeField] private float walkSpeed = 1.6f;
    [SerializeField] private float runSpeed = 3.5f;
    [SerializeField] private float runThreshold = 0.85f;
    [SerializeField] private CharacterController body;
    [SerializeField] private Transform head;

    public void Move(Vector2 stick)
    {
        if (stick.sqrMagnitude < 0.04f) return;           // deadzone
        float speed = stick.magnitude > runThreshold ? runSpeed : walkSpeed;

        // arah relatif kepala, tetapi tetap di bidang horizontal
        var forward = Vector3.ProjectOnPlane(head.forward, Vector3.up).normalized;
        var right   = Vector3.ProjectOnPlane(head.right,   Vector3.up).normalized;
        var dir     = (forward * stick.y + right * stick.x).normalized;

        body.Move(dir * speed * Time.deltaTime);
    }
}
```

Perhatikan satu kesalahan umum: **gravitasi dan loncatan**. Bergerak di tanjakan atau tangga dengan CharacterController membuat kepala naik-turun tanpa input fisik pemain. Hindari tangga curam; gunakan lift atau teleport antar tingkat.

## Snap turn

```csharp
public void SnapTurn(float direction) // -1 atau +1
{
    float angle = 30f * Mathf.Sign(direction);
    xrOrigin.RotateAroundCameraUsingOriginUp(angle);
    // opsional: fade 80 ms untuk meredam lonjakan visual
}
```

Gunakan 30–45°. Kurang dari 30° terasa seperti smooth turn berhenti-berhenti; lebih dari 45° membuat pemain kehilangan orientasi. Beri opsi 15°–90° di menu.

Pada **teleport**, perhatikan masalah orientasi: setelah teleport pemain bisa menghadap arah yang berbeda. Gunakan *teleport with rotation* (pemain memilih arah hadap sebelum pindah) atau pertahankan arah.

## Frame rate: fondasi kenyamanan

Locomotion terbaik pun gagal jika frame rate turun. Target:

| Perangkat | Refresh | Target |
|---|---|---|
| Quest 2 / 3 | 72 / 90 / 120 Hz | stabil di refresh yang dipilih |
| Pantau | Frame time | Konsisten di bawah 11 ms (90 Hz) |

Lebih baik 72 fps yang stabil daripada 90 fps yang goyah. Aktifkan *Application SpaceWarp* hanya bila perlu, dan pantau dengan **OVR Metrics Tool** atau Profiler. Lihat scroll *Profiling Quest Builds* untuk detailnya.

## Opsi kenyamanan wajib di menu

Pemain berbeda toleransinya. Menu pengaturan minimal:

- [ ] Mode locomotion: Teleport / Smooth
- [ ] Turn: Snap (derajat) / Smooth (kecepatan)
- [ ] Vignette: Off / Rendah / Sedang / Tinggi
- [ ] Tangan dominan (kiri/kanan untuk stick gerak)
- [ ] Tinggi duduk/berdiri
- [ ] Kecepatan gerak

Simpan sebagai aset profil (lihat scroll *ScriptableObject sebagai Data Gameplay*) dan terapkan pada saat game dimulai.

## Pengujian: tes dengan manusia, bukan hanya diri sendiri

Developer cepat kebal (*VR legs*). Kamu tidak boleh menjadi satu-satunya penguji kenyamanan.

1. Uji dengan 5 orang baru VR, 15 menit per sesi, dan tanyakan skor kenyamanan (misal skala 1–5 setiap 5 menit).
2. Catat momen spesifik yang tidak nyaman (saat berbelok, di tangga, saat jatuh).
3. Perbaiki satu hal, uji ulang dengan orang berbeda.
4. Hentikan sesi segera jika penguji merasa tidak enak; ini bukan ujian ketahanan.

## Checklist rilis

- [ ] Default: teleport + snap turn.
- [ ] Smooth locomotion dan turn adalah opt-in.
- [ ] Vignette dapat diatur dan memudar halus.
- [ ] Tidak ada head bob, kamera paksa, atau akselerasi bertahap.
- [ ] Frame rate stabil di refresh rate yang dipilih.
- [ ] Menu kenyamanan tersedia sebelum permainan mulai.
- [ ] Sudah diuji oleh pemain pemula.

## Penutup

Kenyamanan bukan fitur tambahan; ia adalah syarat agar fitur lain bisa dinikmati. Jika pemain tidak nyaman dalam sepuluh menit pertama, mereka tidak akan melihat desain level terbaikmu.

Referensi: Meta Horizon, *Locomotion Best Practices* dan *Comfort*; dokumentasi Unity XR Interaction Toolkit (*Locomotion*, *Tunneling Vignette*).

<!--comments-->
intanp: Kak Bayu, bagian quantized velocity itu mengubah game prototipe saya. Setelah menghapus ramp up, teman saya yang biasanya mual bisa main 20 menit.
bayu_w: Senang mendengarnya, Intan. Akselerasi virtual itu pembunuh senyap. Kebanyakan orang menambahkannya karena terasa halus, padahal tubuh membencinya.
gedesurya: Apakah snap turn 30 derajat cukup untuk pemain yang bermain duduk?
bayu_w: Duduk biasanya lebih nyaman dengan 45 karena kursi membatasi putaran tubuh. Tapi berikan opsi 15 sampai 90 supaya pemain memilih sendiri.
arief_s: Dari sisi gameplay: hindari desain yang butuh gerakan cepat berbalik. Itu yang bikin tim kita harus mengubah level kedua.
fajarnug: Saya belum punya headset, tapi bagian aturan emas tentang jangan mengambil alih kamera cocok juga untuk game 2D: screen shake berlebihan di platformer juga mengganggu.
salsa_nur: Catatan dari desain: menu kenyamanan sebaiknya muncul sebelum pemain masuk dunia, bukan tersembunyi di pause. Saya akan tambahkan di spesifikasi UI.
