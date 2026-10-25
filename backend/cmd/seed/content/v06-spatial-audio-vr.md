---
title: Spatial Audio di VR: Kenapa Suara Menentukan Presence (dan Cara Mengaturnya di Unity)
author: gedesurya
category: unity-vr
difficulty: intermediate
status: published
age: 9
featured: false
cover: unsplash:1550751827-4bd374c3f58b
---

Saya datang dari latar belakang game programmer, dan jujur, di proyek pertama saya anggap audio sebagai urusan akhir: taruh musik, taruh beberapa efek suara, selesai. Lalu Kak Bayu meminta saya memakai headphone dan memejamkan mata di sebuah ruang VR kosong yang hanya punya satu sumber suara. Dalam lima detik saya bisa menunjuk dengan tepat dari mana suara datang, dan saya sadar kenapa orang bilang **"VR 50% adalah audio."**

Scroll ini merangkum yang saya pelajari: bagaimana telinga menentukan arah, cara membuat audio spasial di Unity, setelan jarak, ruang, dan performa pada Quest, serta beberapa kesalahan khas pemula.

![Papan sirkuit bercahaya dengan jalur terang](unsplash:1550751827-4bd374c3f58b)
*Audio spasial adalah matematika yang meniru bagaimana kepala dan telingamu mengubah suara.*

## Bagaimana manusia mendengar arah

Otak memakai beberapa petunjuk sekaligus:

| Petunjuk | Penjelasan | Berguna untuk |
|---|---|---|
| **ITD** (Interaural Time Difference) | Suara tiba sedikit lebih awal di satu telinga (hingga ±0,6 ms) | Kiri/kanan, frekuensi rendah |
| **ILD** (Interaural Level Difference) | Suara lebih keras di telinga yang lebih dekat; kepala "membayangi" | Kiri/kanan, frekuensi tinggi |
| **HRTF** (Head-Related Transfer Function) | Bentuk telinga dan kepala menyaring frekuensi sesuai arah | Atas/bawah, depan/belakang |
| **Reverb & rasio langsung/gema** | Seberapa "basah" suara | Jarak dan ukuran ruangan |
| **Atenuasi jarak** | Makin jauh makin pelan dan kehilangan frekuensi tinggi | Jarak |

Panning stereo biasa hanya meniru ILD sederhana. Spasialisasi berbasis **HRTF** meniru semuanya, sehingga suara bisa terdengar dari atas, belakang, dan di luar kepala (bukan "di dalam kepala").

## Mengaktifkan audio spasial di Unity

Di `AudioSource`:

- **Spatial Blend = 1 (3D)**: wajib agar suara bergantung pada posisi.
- **Doppler Level**: 0–1; di VR sebaiknya rendah agar pergeseran nada tidak mengganggu.
- **Volume Rolloff**: *Logarithmic* meniru realisme; *Custom* untuk kontrol penuh.
- **Min/Max Distance**: jarak di mana suara mulai meredup dan jarak di mana ia tak terdengar.

Untuk HRTF, gunakan **spatializer plugin**. Unity mendukung plugin spasial pihak ketiga; di Quest dengan Meta XR SDK kita memakai **Meta XR Audio SDK** (pengganti Oculus Spatializer). Setelah dipasang:

1. `Project Settings → Audio → Spatializer Plugin` → pilih *Meta XR Audio*.
2. Pada `AudioSource`, centang **Spatialize**.
3. Tambahkan **Audio Listener** hanya pada kamera utama (XR Origin → Main Camera), bukan di objek lain.

![Headset VR putih](unsplash:1622979135225-d2ba269cf1ac)
*Headset VR putih.*

## Mengatur jarak dengan kurva

```csharp
[RequireComponent(typeof(AudioSource))]
public class SpatialSfx : MonoBehaviour
{
    [SerializeField] private float minDistance = 0.5f;
    [SerializeField] private float maxDistance = 12f;

    private void Awake()
    {
        var src = GetComponent<AudioSource>();
        src.spatialBlend = 1f;
        src.spatialize = true;
        src.dopplerLevel = 0.2f;
        src.rolloffMode = AudioRolloffMode.Logarithmic;
        src.minDistance = minDistance;
        src.maxDistance = maxDistance;
    }
}
```

Tips jarak:

- **Min distance** = jarak di mana suara berada pada volume penuh. Untuk suara kecil (klik tombol) 0,2–0,5 m; untuk mesin besar 2–5 m.
- **Max distance** jangan terlalu besar; suara yang tidak terdengar pun tetap memakai CPU. Gunakan `Max Distance` agar sumber berhenti diproses di luar jangkauan.
- Suara ambient besar (hujan, angin) lebih baik **tidak** dispasialisasikan sebagai satu titik; gunakan beberapa titik atau *ambisonic bed* agar tidak terdengar seperti speaker di satu tempat.

## Ruang: reverb dan oklusi

Suara yang sama terdengar berbeda di kamar mandi dan di lapangan. Tambahkan:

- **Audio Reverb Zone** atau mixer **Send/Return** dengan reverb untuk karakter ruangan.
- **Oklusi**: ketika dinding berada di antara sumber dan pendengar, redam frekuensi tinggi (low-pass) dan kurangi volume. Cara sederhana: raycast dari pendengar ke sumber; jika terhalang, terapkan `AudioLowPassFilter` dengan cutoff ~1000–2000 Hz dan volume 60%.

```csharp
private void Update()
{
    Vector3 toSource = transform.position - listener.position;
    bool blocked = Physics.Raycast(listener.position, toSource.normalized, toSource.magnitude, wallMask);
    float targetCutoff = blocked ? 1500f : 22000f;
    lowPass.cutoffFrequency = Mathf.Lerp(lowPass.cutoffFrequency, targetCutoff, Time.deltaTime * 8f);
}
```

Perhatikan `Lerp` pada cutoff: perubahan mendadak terdengar seperti "klik". Haluskan transisi.

Meta XR Audio SDK juga mendukung **simulasi geometri ruangan** (reflection dan occlusion berbasis mesh) untuk hasil lebih realistis, namun lebih mahal; gunakan pada ruang penting saja.

## Audio sebagai petunjuk gameplay

Presence bukan hanya realisme; audio memandu perhatian:

| Teknik | Efek |
|---|---|
| Suara musuh dari belakang | Pemain menoleh secara alami |
| Suara lembut berulang di dekat objek penting | Menarik pemain tanpa panah UI |
| Umpan balik interaksi (grab, klik) dari posisi tangan | Konfirmasi aksi tanpa haptik |
| Musik non-spasial (stereo) untuk suasana | Tidak "terikat" ke satu titik |

Gunakan **musik stereo/ambisonic** (tidak terikat posisi) dan **efek suara 3D** untuk benda di dunia.

## Performa di Quest

Audio spasial punya biaya CPU. Panduan kami:

- Batasi jumlah **voice** spasial aktif (misal 16–32). Atur `Project Settings → Audio → Max Real Voices`.
- Gunakan **kompresi** yang sesuai: *Vorbis* untuk musik, *ADPCM* untuk efek pendek yang sering diputar, *PCM* untuk yang sangat pendek.
- Setel *Load Type*: *Decompress On Load* untuk efek kecil; *Streaming* untuk musik panjang.
- Gunakan **voice stealing** berprioritas (Priority 0–256) agar suara penting tidak terputus.
- Pooling `AudioSource` untuk suara berulang (tembakan); lihat scroll object pooling.
- Pantau di Profiler → modul **Audio**.

## Kesalahan pemula

1. **Spatial Blend masih 0**, sehingga suara tidak bergantung posisi.
2. **Dua Audio Listener** di scene (peringatan di console).
3. **Efek suara stereo** dipakai sebagai suara 3D; spasialisasi bekerja paling baik dari **sumber mono**.
4. **Volume rolloff** salah sehingga suara jauh terlalu keras.
5. **Tidak menguji dengan headphone/speaker headset**; audio yang bagus di monitor bisa terdengar buruk di headset.
6. Doppler terlalu kuat sehingga objek lewat terdengar seperti sirine.
7. Suara pemain (langkah, napas) diabaikan; suara itu menegaskan keberadaan tubuh.

## Checklist

- [ ] Spatializer plugin dipilih dan `Spatialize` aktif.
- [ ] SFX 3D memakai sumber mono dengan min/max distance wajar.
- [ ] Ada reverb ruangan dan oklusi sederhana.
- [ ] Musik non-spasial, efek spasial.
- [ ] Voice limit dan kompresi sudah diatur untuk Quest.
- [ ] Diuji dengan speaker headset dan headphone.

## Penutup

Untuk saya, perubahan terbesar adalah cara berpikir: audio bukan lapisan dekorasi, tapi **bagian dari desain ruang**. Mulai merancangnya sejak blockout level, bukan setelah semua selesai.

Referensi: Meta XR Audio SDK documentation, Unity Manual (*Audio Spatializer SDK*, *Audio Source*), dan artikel *Introduction to Spatial Audio* oleh Meta.

<!--comments-->
bayu_w: Tulisan pertama yang bagus, Gede. Pengalaman pertama memejamkan mata di ruang kosong itu memang cara terbaik memahami kenapa audio penting. Catatan: ITD maksimum sekitar 0,6–0,7 ms, jadi angkamu pas.
gedesurya: Terima kasih Kak! Saya senang itu cocok.
intanp: Oklusi dengan low-pass dan Lerp itu persis yang kami butuhkan di level gedung. Sebelumnya suara musuh di balik dinding terdengar sama jelasnya.
fajarnug: Tips mono source untuk suara 3D baru buat saya. Selama ini saya memakai efek stereo dan bingung kenapa spasialnya aneh.
arief_s: Perhatikan juga biaya CPU spatializer di Quest, jangan semua SFX spatialize. Efek UI 2D cukup normal.
maya_kusuma: Bisa kita rancang sound design sejak storyboard? Saya akan tambahkan kolom 'audio cue' di template desain level.
