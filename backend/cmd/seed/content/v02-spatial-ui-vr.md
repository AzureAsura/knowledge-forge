---
title: Merancang UI Spasial di VR: Jarak, Ukuran, dan Ray Interaction yang Nyaman
author: bayu_w
category: unity-vr
difficulty: intermediate
status: published
age: 74
featured: false
cover: unsplash:1622979135225-d2ba269cf1ac
---

Desainer UI yang pindah dari layar ke VR sering membawa kebiasaan lama: menempelkan menu ke wajah pemain seperti HUD game 2D. Hasilnya, teks buram, mata juling, dan leher pegal. Di VR, antarmuka bukan gambar di atas layar; ia adalah **objek di ruang 3D** yang punya jarak, ukuran, dan sudut pandang.

Scroll ini mengumpulkan aturan praktis yang kami pakai untuk menu, HUD, dan interaksi di proyek Quest: berapa jauh menaruh panel, seberapa besar teks, kapan memakai ray atau sentuhan langsung, dan bagaimana menulis kodenya dengan Canvas World Space.

![Headset VR putih di atas meja](unsplash:1622979135225-d2ba269cf1ac)
*Headset menampilkan dua gambar. Cara kita menaruh UI di antara dua gambar itu menentukan nyaman atau tidaknya mata.*

## Konsep dasar: UI hidup di ruang

Ada empat cara menaruh UI di VR:

| Mode | Cara kerja | Pakai untuk | Risiko |
|---|---|---|---|
| **Head-locked** | Menempel pada kepala | (hampir tidak pernah) | Tidak nyaman, mual |
| **Lazy follow** | Mengikuti kepala dengan jeda | Notifikasi, petunjuk | Mengganggu jika terlalu cepat |
| **World-locked** | Diam di dunia | Menu, panel info | Pemain harus berbalik |
| **Wrist/hand-anchored** | Menempel di pergelangan | Menu sering dipakai | Perlu hand tracking atau controller |

Aturan: **hindari head-locked**. UI yang selalu menempel pada pandangan membuat mata tidak bisa berfokus, karena tidak ada petunjuk kedalaman. Gunakan *lazy follow* dengan damping dan *dead zone*, sehingga panel hanya mengikuti saat kepala berpaling cukup jauh.

## Jarak: zona nyaman

Mata manusia berfokus (akomodasi) dan menyatukan dua gambar (vergensi). Di headset, titik fokus optik tetap pada jarak tertentu (±1,3–2 m untuk banyak perangkat), tetapi vergensi mengikuti jarak objek. Jika keduanya sangat berbeda, terjadi **konflik vergensi-akomodasi** yang melelahkan.

Pedoman yang kami pakai:

| Jenis UI | Jarak dari mata |
|---|---|
| Panel baca utama | 1,5 – 2,5 m |
| Menu interaktif (ray) | 1,0 – 2,0 m |
| Interaksi sentuh langsung | 0,4 – 0,7 m (jangkauan tangan) |
| Minimum absolut | 0,5 m; lebih dekat akan menyebabkan juling |
| HUD informasi sementara | 2 m, lazy follow |

Panduan Meta juga menyebutkan dua hal: jangan memaksa interaksi langsung pada objek jauh atau yang butuh waktu lama (melelahkan), dan jangan menaruh objek sentuh terlalu dekat dengan wajah (ketidaknyamanan visual).

![Pemain VR dengan controller](unsplash:1593508512255-86ab42a8e620)
*Pemain VR dengan controller.*

## Ukuran: pakai satuan sudut, bukan piksel

Piksel tidak bermakna di VR; yang penting adalah **ukuran sudut** yang dilihat mata. Teks yang nyaman dibaca minimal sekitar **1,0–1,5° tinggi huruf** (dan lebih besar untuk teks penting). Rumus:

```
tinggi_dunia (m) = 2 × jarak (m) × tan(sudut / 2)
```

Contoh: huruf setinggi 1,2° di jarak 2 m → `2 × 2 × tan(0,6°) ≈ 0,042 m` (4,2 cm). Untuk panel berukuran 1,2 m × 0,7 m di 2 m, resolusi canvas 1200 × 700 piksel (≈1000 px/m) menjaga teks tajam.

Tombol interaktif minimal ±3° (jarak 2 m ≈ 10 cm) agar mudah ditarget dengan ray, dan jarak antar tombol cukup untuk mengatasi getaran tangan.

## Canvas World Space di Unity

```csharp
public class WorldCanvasSetup : MonoBehaviour
{
    [SerializeField] private Canvas canvas;
    [SerializeField] private float distance = 2f;
    [SerializeField] private float width = 1.2f;
    [SerializeField] private float height = 0.7f;
    [SerializeField] private Vector2Int pixelSize = new(1200, 700);

    private void Start()
    {
        canvas.renderMode = RenderMode.WorldSpace;
        var rt = canvas.GetComponent<RectTransform>();
        rt.sizeDelta = pixelSize;
        rt.localScale = new Vector3(width / pixelSize.x, height / pixelSize.y, 1f);

        // taruh di depan pemain sekali, lalu biarkan diam di dunia
        var head = Camera.main.transform;
        var pos = head.position + Vector3.ProjectOnPlane(head.forward, Vector3.up).normalized * distance;
        transform.SetPositionAndRotation(pos, Quaternion.LookRotation(pos - head.position, Vector3.up));
    }
}
```

Poin penting:

- Skala canvas = ukuran dunia ÷ piksel, sehingga 1 unit canvas = sepersekian milimeter.
- Gunakan komponen **TrackedDeviceGraphicRaycaster** (XRI) menggantikan `GraphicRaycaster`, dan **XR UI Input Module** pada EventSystem.
- Pilih shader UI yang mendukung depth atau gunakan *overlay* hanya bila perlu; UI menembus dinding merusak kedalaman.
- Matikan *Canvas Scaler* jika ukuran piksel dikelola sendiri.

## Ray interaction vs sentuhan langsung

| | Ray (pointer) | Direct touch (poke) |
|---|---|---|
| Jarak | Jauh (1–3 m) | Dekat (jangkauan tangan) |
| Akurasi | Terpengaruh getar tangan | Tinggi, natural |
| Kelelahan | Rendah (tangan di pinggang) | Lebih tinggi (lengan terangkat) |
| Umpan balik | Garis + titik | Menekan fisik + haptik |
| Cocok untuk | Menu utama, panel besar | Papan tombol, panel kontrol dalam game |

Tips ray: sediakan **hover state** yang jelas (warna, skala 1,05, suara halus), haptik kecil saat hover dan lebih kuat saat klik, serta **dead zone** kecil agar klik tidak meleset karena getar. Gunakan *snap to target* ringan untuk tombol kecil.

Tips poke: tombol harus punya **kedalaman** (bergerak ke belakang saat ditekan, 5–10 mm), dengan batas aktivasi di ~70% perjalanan, dan umpan balik haptik tepat saat aktivasi.

## Tipografi di VR

- Pakai font sans-serif dengan stroke tebal dan jarak antar huruf agak renggang; hindari font tipis (hairline).
- Kontras tinggi, tapi hindari putih murni di atas hitam pekat pada area luas (silau); abu sangat terang di atas biru tua lebih nyaman.
- Minimalkan teks: VR buruk untuk membaca panjang. Gunakan ikon + label pendek, suara, dan visual spasial.
- Jangan menggunakan teks yang lebih kecil dari 1° apa pun alasannya. Resolusi per derajat (PPD) headset kita sekitar 20–25 PPD; teks terkecil hanya terbaca bila cukup piksel.
- Aktifkan **TextMeshPro SDF** supaya teks tetap tajam ketika dilihat dari sudut berbeda.

## Umpan balik: setiap aksi harus terasa

Di VR tidak ada klik fisik, jadi umpan balik harus berlapis:

1. **Visual**: perubahan warna/skala, cahaya tepi.
2. **Audio**: suara pendek dan spasial dari posisi tombol.
3. **Haptik**: getaran controller (durasi 20–50 ms, amplitudo sedang).

Tanpa ketiganya, pemain ragu apakah aksinya terdaftar dan menekan berulang kali.

## Aksesibilitas

- Opsi **tinggi UI** (naik/turun) dan **jarak panel** untuk pemain duduk atau berdiri.
- Mode **satu tangan**.
- Ukuran teks bisa diubah (misal 100%, 125%, 150%).
- Hindari membutuhkan gerakan cepat atau pengulangan presisi.
- Pastikan semua informasi penting juga tersedia lewat suara atau ikon, bukan warna saja.

## Checklist desain

- [ ] Tidak ada UI head-locked; lazy follow dengan dead zone bila perlu.
- [ ] Panel baca di 1,5–2,5 m; sentuhan langsung 0,4–0,7 m.
- [ ] Teks ≥ 1° (lebih besar untuk judul), target tombol ≥ 3°.
- [ ] Canvas World Space dengan TrackedDeviceGraphicRaycaster.
- [ ] Hover, klik, dan konfirmasi punya visual + audio + haptik.
- [ ] Opsi tinggi, jarak, dan ukuran teks tersedia.
- [ ] Sudah diuji di headset, bukan hanya di simulator editor.

## Penutup

UI VR terbaik hampir tidak terasa: ia ada di tempat yang tepat, pada jarak yang tepat, dengan ukuran yang cukup, dan menjawab setiap sentuhan. Mulailah dari satuan manusia (derajat, sentimeter, milidetik), bukan satuan layar (piksel).

Referensi: Meta Horizon, *Comfort* dan *UI/Interaction Design*; dokumentasi Unity XR Interaction Toolkit (*UI Interaction*).

<!--comments-->
salsa_nur: Rumus ukuran sudut ini langsung saya masukkan ke spesifikasi UI. Selama ini saya memberi ukuran font dalam piksel dan developer VR selalu bilang 'kecil sekali'.
bayu_w: Itu persis alasan saya menulisnya, Salsa. Satuan layar tidak berarti di VR. Pakai derajat dan sentimeter, lalu konversi.
maya_kusuma: Untuk tim desain: kita buat variasi komponen di Figma dengan anotasi ukuran sudut di setiap tombol. Nanti saya bagikan contoh.
intanp: Haptik 20 sampai 50 ms itu angka bagus. Punyaku terlalu lama dan terasa seperti motor ponsel.
gedesurya: Poke interaction lebih menyenangkan untuk papan tombol, tapi lengan lelah. Apakah bisa digabung ray sebagai alternatif?
bayu_w: Bisa dan sebaiknya begitu. Sediakan keduanya dan biarkan sistem memilih berdasarkan jarak tangan ke panel.
