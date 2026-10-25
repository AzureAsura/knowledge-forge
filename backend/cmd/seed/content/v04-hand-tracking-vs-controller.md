---
title: Hand Tracking vs Controller di VR: Kapan Memilih yang Mana (Catatan dari Prototipe Kami)
author: intanp
category: unity-vr
difficulty: beginner
status: published
age: 60
featured: false
cover: unsplash:1558346490-a72e53ae2d4f
---

Saya baru saja menyelesaikan dua prototipe VR di Palm Studio: satu memakai **controller** (Quest Touch) dan satu memakai **hand tracking** (tangan telanjang, tanpa controller). Setelah 30 sesi uji dengan teman dan rekan tim, saya punya banyak catatan tentang kapan masing-masing pilihan masuk akal dan kapan merepotkan.

Scroll ini bukan panduan resmi; ini catatan dari sudut pandang orang yang baru dan memperhatikan apa yang membingungkan pemain pemula. Kak Bayu membantu mengoreksi bagian teknisnya.

![Perangkat elektronik dengan kabel dan papan sirkuit](unsplash:1558346490-a72e53ae2d4f)
*Di balik "tangan di udara" ada kamera, model deteksi, dan filter yang menebak pose jari kamu puluhan kali per detik.*

## Cara kerja singkat

- **Controller**: sensor inersia dan penelusuran optik pada controller; punya tombol, trigger, grip, joystick, dan haptik (getar). Hasilnya presisi dan konsisten.
- **Hand tracking**: kamera di headset melihat tanganmu, lalu model memperkirakan posisi sendi-sendi jari (±26 titik per tangan). Tanpa tombol; semuanya lewat **gestur**.

Keduanya diakses di Unity lewat OpenXR dan XR Interaction Toolkit (XRI); hand tracking memakai paket **XR Hands** dan ekstensi OpenXR `XR_EXT_hand_tracking`.

## Perbandingan dari pengalaman kami

| Aspek | Controller | Hand tracking |
|---|---|---|
| Presisi | Sangat tinggi | Baik, tapi bergetar di tepi pandang |
| Latensi | Rendah | Sedikit lebih tinggi |
| Tombol/aksi | Banyak (trigger, grip, A/B, stick) | Terbatas pada gestur |
| Haptik | Ada | **Tidak ada** |
| Lokomosi | Mudah (stick) | Sulit; teleport via gestur |
| Kurva belajar pemain baru | Sedang (banyak tombol) | **Rendah** (tangan itu natural) |
| Kelelahan | Rendah (tangan di pinggang) | Lebih tinggi (lengan terangkat) |
| Pencahayaan | Tidak peduli | **Butuh cahaya cukup**, terganggu cahaya matahari langsung |
| Tangan saling menutupi | Tidak masalah | Tracking hilang saat tangan saling tumpuk |
| Aksesibilitas | Perlu menggenggam | Bagus untuk yang sulit menggenggam, tapi butuh gerak halus |

![Headset VR putih](unsplash:1622979135225-d2ba269cf1ac)
*Headset VR putih.*

## Kapan hand tracking cocok

1. **Pengalaman santai atau edukasi** dengan interaksi sederhana: menunjuk, menjepit (pinch), menggeser, mengambil objek.
2. **Pemain yang belum pernah memakai VR.** Kami melihat orang tua dan teman non-gamer langsung paham "jepit untuk mengambil" tanpa tutorial tombol.
3. **Demo dan kios**: tidak perlu mengisi daya atau membersihkan controller.
4. **UI menu**: poke (menyentuh) tombol dengan telunjuk terasa sangat natural.
5. **Ekspresi sosial**: melambai, menunjuk, tepuk tangan.

## Kapan controller lebih baik

1. **Game aksi yang butuh presisi dan banyak input**: menembak, melempar tepat, menarik busur.
2. **Locomotion** yang melibatkan joystick, atau aksi yang butuh tombol cepat.
3. **Sesi panjang**: lengan yang terus terangkat cepat lelah (*gorilla arm*).
4. **Umpan balik fisik** penting: senjata, alat, atau apa pun yang harus *terasa*.
5. **Lingkungan dengan cahaya sulit** (outdoor, ruangan terlalu gelap).

## Interaksi hand tracking yang andal

Dari prototipe kami, gestur yang paling konsisten:

| Gestur | Dipakai untuk | Catatan |
|---|---|---|
| **Pinch** (jempol + telunjuk) | pilih, ambil, tarik | Paling andal; jadikan interaksi utama |
| **Poke** (telunjuk menunjuk) | menyentuh tombol UI | Beri kedalaman dan umpan balik visual |
| **Grab** (menggenggam) | mengambil objek besar | Lebih tidak andal daripada pinch |
| **Palm up/menu** | membuka menu di telapak | Mudah dikenali, hindari memicu tidak sengaja |
| Gestur kompleks (tanda "OK", angka) | — | **Hindari**: tingkat salah deteksi tinggi |

Aturan yang kami pelajari:

- **Beri umpan balik yang jelas.** Tanpa haptik, ganti dengan visual (objek menyala saat pinch), audio ("klik"), dan *snap* objek ke tangan.
- **Sediakan toleransi.** Ambang pinch jangan terlalu ketat; beri *hysteresis* (ambang untuk mulai berbeda dari ambang untuk melepas) supaya objek tidak jatuh karena getar kecil.
- **Fallback saat tracking hilang.** Bekukan pose terakhir dan tampilkan indikator, jangan menjatuhkan objek seketika.
- **Jangan butuhkan dua tangan tumpang tindih.**

## Di Unity: mendeteksi pinch

Dengan paket *XR Hands*, pose sendi dapat dibaca langsung:

```csharp
using UnityEngine.XR.Hands;

public class PinchDetector : MonoBehaviour
{
    [SerializeField] private float pinchOn = 0.020f;   // 2 cm: mulai pinch
    [SerializeField] private float pinchOff = 0.035f;  // 3.5 cm: lepas (hysteresis)
    private XRHandSubsystem hands;
    private bool pinching;

    private void Update()
    {
        hands ??= GetSubsystem();
        var hand = hands.rightHand;
        if (!hand.isTracked) { pinching = false; return; }

        if (hand.GetJoint(XRHandJointID.ThumbTip).TryGetPose(out var thumb) &&
            hand.GetJoint(XRHandJointID.IndexTip).TryGetPose(out var index))
        {
            float d = Vector3.Distance(thumb.position, index.position);
            pinching = pinching ? d < pinchOff : d < pinchOn;
        }
    }
}
```

Hysteresis dua ambang (2 cm untuk mulai, 3,5 cm untuk lepas) menghilangkan "kedip" pinch yang bikin objek tersendat. Untuk produksi, gunakan komponen XRI (`XRHandSkeletonDriver`, `HandPinch` interaktor) dan hanya menulis kode kustom bila perlu.

## Mendukung keduanya sekaligus

Pemain sering berpindah (misal menaruh controller di tengah sesi). Quest mendukung perpindahan otomatis. Rancang interaksi utama supaya punya **padanan di kedua mode**:

| Aksi | Controller | Hand |
|---|---|---|
| Pilih/ambil | Trigger / grip | Pinch / grab |
| Tombol UI | Ray + trigger | Poke atau pinch jarak jauh |
| Menu | Tombol menu | Palm up |
| Teleport | Stick + lepas | Pinch + tarik |

Gunakan satu lapisan abstraksi ("Select", "Grab", "Menu") dengan Input Action, lalu hubungkan sumbernya berbeda-beda. Pelajaran dari scroll Input System: kode peduli aksi, bukan perangkat.

## Hal yang perlu diperhatikan

- **Izin dan pengaturan**: aktifkan *Hand Tracking Support* di OVR/OpenXR settings dan deklarasikan di manifest (`com.oculus.permission.HAND_TRACKING`).
- **Privasi**: tracking tangan memakai data kamera; jelaskan pada pemain bila relevan.
- **Ukuran tangan** berbeda; uji dengan banyak orang, termasuk tangan kecil dan besar.
- **Kelelahan**: beri jeda, rancang interaksi di zona nyaman (siku di samping badan, tangan di depan dada) bukan menggapai jauh.

## Kesimpulan saya

Tidak ada pemenang mutlak. **Hand tracking menurunkan hambatan masuk**, controller memberi presisi dan haptik. Jika produkmu untuk audiens baru VR dan interaksinya sederhana, mulai dengan hand tracking. Jika produkmu butuh aksi cepat atau sesi panjang, pilih controller, dan jika memungkinkan dukung keduanya.

Referensi: Meta Horizon (*Hand Tracking Design*), dokumentasi Unity *XR Hands* dan *XR Interaction Toolkit*.

<!--comments-->
bayu_w: Catatan jujur dan berguna, Intan. Satu koreksi kecil: jumlah titik sendi per tangan tergantung runtime (OpenXR menyebut 26 joint), jadi 'kurang lebih 26' sudah pas. Hysteresis pada pinch adalah trik yang sering dilupakan, bagus kamu menyebutkannya.
intanp: Terima kasih Kak Bayu. Saya memang awalnya pakai satu ambang dan objek terus berkedip jatuh-ambil.
gedesurya: Kalau pemain memakai sarung tangan atau tangan penuh tato, apakah tracking terpengaruh?
intanp: Sarung tangan tebal bisa mengganggu, tato biasanya tidak. Kami mencoba dengan beberapa teman dan hasilnya bervariasi, jadi saya sarankan menyediakan controller sebagai cadangan.
maya_kusuma: Poin tentang gesture kompleks yang sebaiknya dihindari penting untuk desain tutorial. Kita pakai pinch dan poke saja.
salsa_nur: Sebagai desainer saya suka sekali tabel padanan aksi di akhir. Itu bisa langsung jadi dasar spesifikasi interaksi.
fajarnug: Saya penasaran, tapi saya belum punya headset. Mungkin nanti saya mencoba di kantor.
