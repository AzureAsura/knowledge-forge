---
title: Animator State Machine vs Kode: Mengelola Animasi Karakter 2D Tanpa Spaghetti
author: arief_s
category: unity-2d
difficulty: intermediate
status: published
age: 55
featured: false
cover: unsplash:1552820728-8b83bb6b773f
---

Setiap game 2D mencapai titik yang sama: karakter bisa idle, lari, lompat, jatuh, menyerang, terkena damage, dan mati. Lalu seseorang menambahkan "menyerang sambil lompat", dan Animator Controller berubah menjadi sarang laba-laba dengan 40 panah transisi yang tidak ada yang berani menyentuh.

Scroll ini membahas cara berpikir yang membuat animasi karakter tetap bisa dirawat: kapan memakai **Animator state machine**, kapan memicu animasi dari **kode**, bagaimana merancang parameter, dan pola untuk menghindari ledakan transisi. Contohnya karakter platformer 2D dengan sprite sheet.

![Gamepad di atas permukaan gelap dengan cahaya merah](unsplash:1552820728-8b83bb6b773f)
*Input datang dari pemain; animasi seharusnya hanya cerminan state karakter, bukan tempat logika game tinggal.*

## Prinsip utama: animasi mencerminkan state, bukan menentukannya

Kesalahan desain paling mahal: membiarkan Animator menjadi sumber kebenaran ("kalau animasi serang selesai, baru boleh gerak"). Logika game lalu bergantung pada timing animasi, yang rapuh dan sulit dites.

Pisahkan dua hal:

- **State karakter** (di kode): `Idle`, `Running`, `Jumping`, `Falling`, `Attacking`, `Hurt`, `Dead`.
- **Representasi visual** (di Animator): animasi yang cocok dengan state itu.

Kode memutuskan apa yang terjadi; Animator hanya menampilkannya.

## Opsi 1: Animator Controller dengan parameter

Cara standar. Buat Animator Controller, tambahkan state dengan klip animasi, hubungkan dengan transisi yang dikendalikan **parameter**.

| Tipe parameter | Pakai untuk | Contoh |
|---|---|---|
| `Float` | nilai kontinu | `Speed` (untuk blend idle ↔ lari) |
| `Bool` | kondisi yang bertahan | `IsGrounded`, `IsDead` |
| `Int` | pilihan diskrit | `WeaponType` |
| `Trigger` | kejadian sekali | `Attack`, `Hurt` |

Aturan emas parameter:

1. **Sedikit dan bermakna.** Parameter yang mencerminkan fakta (`IsGrounded`, `Speed`), bukan perintah (`PlayRunAnimation`).
2. **`Bool` untuk kondisi, `Trigger` untuk kejadian.** Trigger yang tidak terpakai bisa "menyangkut" dan memicu animasi terlambat.
3. **Hash nama parameter**, jangan kirim string tiap frame.

```csharp
public class PlayerAnimation : MonoBehaviour
{
    private static readonly int Speed = Animator.StringToHash("Speed");
    private static readonly int IsGrounded = Animator.StringToHash("IsGrounded");
    private static readonly int VerticalVelocity = Animator.StringToHash("VerticalVelocity");
    private static readonly int Attack = Animator.StringToHash("Attack");

    [SerializeField] private Animator animator;
    [SerializeField] private Rigidbody2D rb;
    [SerializeField] private GroundCheck ground;

    private void Update()
    {
        animator.SetFloat(Speed, Mathf.Abs(rb.linearVelocity.x));
        animator.SetBool(IsGrounded, ground.IsGrounded);
        animator.SetFloat(VerticalVelocity, rb.linearVelocity.y);
    }

    public void TriggerAttack() => animator.SetTrigger(Attack);
}
```

Kelas ini hanya **menyalin fakta** dari fisika ke Animator. Tidak ada keputusan di sini.

![Perangkat game retro](unsplash:1550745165-9bc0b252726f)
*Perangkat game retro.*

## Menghindari ledakan transisi

Dengan 8 state yang saling terhubung, jumlah panah bisa 56. Tiga teknik untuk menjinakkannya.

### a) Blend Tree untuk gerakan kontinu

Alih-alih state `Idle`, `Walk`, `Run` dengan transisi di antaranya, buat satu state **Locomotion** berisi *Blend Tree 1D* dengan parameter `Speed`: nilai 0 = idle, 2 = walk, 5 = run. Unity mencampur animasi secara mulus. Tiga state dan enam panah menjadi satu state.

### b) Any State untuk gangguan global

Kejadian yang bisa terjadi kapan saja (`Hurt`, `Dead`) tidak perlu panah dari setiap state. Gunakan **Any State → Hurt** dengan kondisi trigger `Hurt`. Perhatikan opsi **Can Transition To Self** (matikan, supaya animasi tidak restart terus) dan prioritas transisi.

### c) Sub-State Machine untuk mengelompokkan

Kelompokkan `Idle/Walk/Run` menjadi sub-state **Grounded**, dan `Jump/Fall` menjadi **Airborne**. Transisi besar menjadi `Grounded ↔ Airborne` berdasarkan `IsGrounded`, dan detail tinggal di dalam grup. Grafnya muat satu layar.

## Transisi: pengaturan yang menentukan "rasa"

| Opsi | Saran | Efek |
|---|---|---|
| Has Exit Time | **Off** untuk aksi responsif | Transisi langsung saat kondisi benar |
| Transition Duration | 0–0,1 detik untuk pixel art | Pixel art jarang butuh blend panjang |
| Interruption Source | Current State / Next State | Mengatur apakah transisi bisa dipotong |
| Fixed Duration | On | Durasi dalam detik, bukan persen klip |

Untuk sprite pixel art 2D biasanya **Transition Duration = 0** dan **Has Exit Time = Off**, karena campuran frame antar sprite terlihat buruk. Yang memerlukan exit time adalah animasi yang *harus* selesai (serangan, mati).

## Animation Events: menyinkronkan efek dengan frame

Jangan menebak timing dengan `Invoke(0.3f)`. Letakkan **Animation Event** pada frame yang tepat di klip:

```csharp
// dipanggil dari Animation Event pada frame kontak pedang
public void OnAttackHit()
{
    var hits = Physics2D.OverlapCircleAll(attackPoint.position, 0.5f, enemyLayer);
    foreach (var h in hits) h.GetComponent<Health>()?.TakeDamage(damage);
}

// dipanggil pada frame terakhir klip serang
public void OnAttackEnd() => state = PlayerState.Idle;
```

Dengan cara ini, hitbox aktif tepat saat ayunan terlihat mengenai, dan perubahan timing animasi tidak mematahkan logika (cukup geser event di timeline).

Hati-hati: jika state berubah sebelum klip selesai (karena interupsi), `OnAttackEnd` mungkin tidak terpanggil. Beri pengaman: reset state saat masuk state lain, atau gunakan `StateMachineBehaviour` pada state serang untuk `OnStateExit`.

## Opsi 2: memutar animasi dari kode

Untuk objek sederhana (koin berputar, pintu), Animator Controller terlalu berat. Opsi:

- **`animator.Play("Open")`** langsung memutar state. Cepat ditulis, tetapi mem-bypass graf transisi, jadi logika tersebar.
- **`Animator.CrossFade(hash, 0.1f)`** untuk blend dari kode.
- **Playables API / sprite animasi sendiri** (mengganti `sprite` per interval) untuk animasi yang sangat sederhana dan jumlah objek ribuan.
- **DOTween / tween manual** untuk efek UI dan squash-and-stretch kecil.

Aturan saya: **karakter dan musuh dengan banyak state → Animator Controller. Objek dengan satu atau dua animasi → Play dari kode.** Jangan campur dua pendekatan pada objek yang sama.

## Pola: StateMachine di kode + Animator tipis

Untuk karakter kompleks, kami menaruh logika di state machine kode, dan Animator hanya menerima state aktif:

```csharp
public enum PlayerState { Idle, Run, Jump, Fall, Attack, Hurt, Dead }

public class PlayerController : MonoBehaviour
{
    public PlayerState State { get; private set; }

    public void SetState(PlayerState next)
    {
        if (State == next || State == PlayerState.Dead) return;
        State = next;
        animator.SetInteger(StateHash, (int)next);
    }
}
```

Di Animator, satu parameter `Int State` dan transisi `Any State → X` dengan `State == X`. Grafnya datar dan mudah dibaca, sementara aturan "dari state apa boleh ke state apa" ada di kode yang bisa dites.

## Debugging

- Buka jendela **Animator** saat game berjalan: state aktif berwarna biru dan panah transisi menyala.
- Lihat nilai parameter di panel *Parameters* secara live.
- Kalau animasi "tidak mau berubah", periksa: Has Exit Time, urutan prioritas transisi, dan apakah trigger sudah dipakai.
- Kalau animasi tersentak di awal, periksa *Transition Offset* dan "Can Transition To Self".

## Checklist rancangan

- [ ] State karakter ada di kode, bukan di Animator.
- [ ] Parameter mencerminkan fakta; nama di-hash.
- [ ] Blend Tree untuk gerak kontinu, Any State untuk gangguan global, sub-state untuk kelompok.
- [ ] Has Exit Time off kecuali animasi harus selesai.
- [ ] Efek dan hitbox disinkronkan dengan Animation Event.

## Penutup

Animator Controller adalah alat visual yang bagus selama kamu memperlakukannya sebagai **tampilan**. Begitu logika game bergantung pada timing panah transisi, setiap penambahan fitur terasa seperti memindahkan kabel di panel listrik yang berantakan. Pertahankan satu arah aliran: input → state di kode → parameter → animasi.

Referensi: Unity Manual (*Animator Controller*, *Blend Trees*, *Animation Events*, *StateMachineBehaviour*).

<!--comments-->
fajarnug: Konsep Animator sebagai tampilan saja itu mengubah cara saya merancang. Kemarin Hurt dan Attack saling menimpa dan akhirnya saya paham karena logika ada di panah, bukan di kode.
arief_s: Itu masalah umum, Fajar. Panah transisi sulit dites dan sulit direview di PR. Kode bisa.
gedesurya: Apakah StateMachineBehaviour lebih baik daripada Animation Event untuk OnAttackEnd?
arief_s: Untuk akhir state, ya, lebih andal karena OnStateExit selalu terpanggil walau animasi diinterupsi. Animation Event bagus untuk frame di tengah klip, seperti kontak pedang.
intanp: Untuk VR kita biasanya tidak memakai Animator untuk tangan. Apakah ini masih relevan?
arief_s: Untuk avatar tangan masih, tapi inputnya dari pose OpenXR. Konsep memisahkan state dari visual tetap berlaku.
komang_adi: Saya bukan game dev, tapi pola state machine di kode mirip dengan status scroll di backend kami: draft, pending, published, archived.
arief_s: Persis, Komang. State machine adalah pola umum, hanya medianya berbeda.
