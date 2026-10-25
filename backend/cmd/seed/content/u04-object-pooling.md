---
title: Object Pooling di Unity: Peluru, Partikel, dan Garbage Collector yang Tenang
author: fajarnug
category: unity-2d
difficulty: intermediate
status: published
age: 47
featured: false
cover: unsplash:1580234811497-9df7fd2f357e
---

Saya anak magang di tim game dan tugas pertama saya adalah "bikin musuh yang menembak." Saya membuat prefab peluru, memanggil `Instantiate` setiap tembakan, dan `Destroy` saat peluru menabrak sesuatu. Berhasil, sampai di level 3 dengan 12 musuh yang menembak bersamaan, game mulai **patah-patah setiap beberapa detik**.

Profiler menunjukkan lonjakan di `GC.Collect`. Kak Arief langsung bilang: "Pooling." Scroll ini adalah cara saya memahaminya, dengan pengukuran sebelum dan sesudah.

![Gamepad putih di atas latar ungu](unsplash:1580234811497-9df7fd2f357e)
*Frame time yang tidak rata lebih merusak rasa bermain daripada frame rate rendah yang stabil.*

## Kenapa `Instantiate` dan `Destroy` mahal

Setiap `Instantiate`:

1. mengalokasikan memori untuk GameObject dan komponennya;
2. menginisialisasi komponen (`Awake`, `OnEnable`);
3. mendaftarkan objek ke sistem fisika, renderer, dan lain-lain.

Setiap `Destroy` meninggalkan sampah di heap managed. Setelah cukup banyak, **Garbage Collector** berhenti sejenak untuk membersihkannya. Jeda itu terlihat sebagai *hitch* (frame yang panjang).

Pooling menukar: alih-alih membuat dan menghancurkan, kita **membuat sekali di awal** lalu **menonaktifkan dan memakai ulang**.

## Percobaan: sebelum pooling

Skenario: 12 penembak, masing-masing 3 peluru/detik, peluru hidup 2 detik. Dijalankan di editor 60 detik dengan Profiler:

| Metrik | Tanpa pooling |
|---|---|
| Alokasi GC per detik | ~38 KB |
| Jumlah GC.Collect dalam 60 dtk | 14 |
| Frame terpanjang | 41 ms |
| `Instantiate` per detik | 36 |

Spike 41 ms berarti satu frame terlewat dan terlihat mengganggu.

![Perangkat game retro](unsplash:1550745165-9bc0b252726f)
*Perangkat game retro.*

## Pooling manual: versi sederhana

```csharp
public class BulletPool : MonoBehaviour
{
    [SerializeField] private Bullet prefab;
    [SerializeField] private int initialSize = 40;

    private readonly Queue<Bullet> available = new();

    private void Awake()
    {
        for (int i = 0; i < initialSize; i++)
            available.Enqueue(Create());
    }

    private Bullet Create()
    {
        var b = Instantiate(prefab, transform);
        b.gameObject.SetActive(false);
        b.Init(this);
        return b;
    }

    public Bullet Get(Vector2 position, Vector2 direction)
    {
        var b = available.Count > 0 ? available.Dequeue() : Create();
        b.transform.SetPositionAndRotation(position, Quaternion.identity);
        b.gameObject.SetActive(true);
        b.Launch(direction);
        return b;
    }

    public void Release(Bullet b)
    {
        b.gameObject.SetActive(false);
        available.Enqueue(b);
    }
}
```

Dan peluru mengembalikan dirinya, **bukan** `Destroy`:

```csharp
public class Bullet : MonoBehaviour
{
    private BulletPool pool;
    private Rigidbody2D rb;
    private float lifeTimer;

    public void Init(BulletPool p) { pool = p; rb = GetComponent<Rigidbody2D>(); }

    public void Launch(Vector2 dir)
    {
        lifeTimer = 2f;
        rb.linearVelocity = dir * 12f;
    }

    private void Update()
    {
        lifeTimer -= Time.deltaTime;
        if (lifeTimer <= 0f) pool.Release(this);
    }

    private void OnTriggerEnter2D(Collider2D other)
    {
        if (other.TryGetComponent<Health>(out var h)) h.TakeDamage(1);
        pool.Release(this);
    }
}
```

Poin penting yang saya pelajari:

- **State harus di-reset di `Launch`/`OnEnable`**, karena objek yang dipakai ulang membawa sisa nilai lama (kecepatan, timer, trail). Lupa mereset adalah bug nomor satu pooling.
- Jangan memanggil `Release` dua kali untuk objek yang sama; objek akan masuk antrean dua kali dan dipakai oleh dua penembak sekaligus. Beri pengaman (`if (!gameObject.activeSelf) return;`).

## Pooling bawaan: `UnityEngine.Pool`

Sejak Unity 2021 ada `ObjectPool<T>` bawaan, jadi tidak perlu menulis kelas sendiri:

```csharp
using UnityEngine.Pool;

public class Shooter : MonoBehaviour
{
    [SerializeField] private Bullet prefab;
    private ObjectPool<Bullet> pool;

    private void Awake()
    {
        pool = new ObjectPool<Bullet>(
            createFunc: () => Instantiate(prefab),
            actionOnGet: b => b.gameObject.SetActive(true),
            actionOnRelease: b => b.gameObject.SetActive(false),
            actionOnDestroy: b => Destroy(b.gameObject),
            collectionCheck: true,     // deteksi Release ganda (hanya Editor)
            defaultCapacity: 40,
            maxSize: 200);
    }

    public void Fire(Vector2 pos, Vector2 dir)
    {
        var b = pool.Get();
        b.transform.position = pos;
        b.Launch(dir, () => pool.Release(b));
    }
}
```

Keuntungannya: `collectionCheck` menangkap Release ganda saat development, `maxSize` membatasi pertumbuhan, dan `actionOnDestroy` membersihkan saat pool melebihi batas.

## Setelah pooling

Skenario sama:

| Metrik | Tanpa pooling | Dengan pooling |
|---|---|---|
| Alokasi GC per detik | ~38 KB | ~0,4 KB |
| GC.Collect dalam 60 dtk | 14 | 0 |
| Frame terpanjang | 41 ms | 17 ms |
| `Instantiate` per detik | 36 | 0 (setelah warm-up) |

Frame time rata dan tidak ada lagi patah-patah.

## Yang cocok di-pool dan yang tidak

| Cocok | Tidak perlu |
|---|---|
| Peluru, proyektil | Objek unik (pemain, boss) |
| Partikel/efek ledakan | Objek dibuat sekali per level |
| Musuh yang spawn berulang | Objek yang sangat jarang dibuat |
| Elemen UI dalam daftar panjang | Prefab sederhana yang dibuat ratusan ms sekali |
| Teks damage melayang | |

Jangan mem-pool semuanya "just in case". Pooling menambah kode dan risiko bug state. Ukur dulu dengan Profiler; kalau tidak ada masalah GC atau spike `Instantiate`, tidak perlu.

## Partikel: sebaiknya bukan GameObject baru

Untuk efek partikel, jangan `Instantiate` prefab ParticleSystem tiap ledakan. Pakai pool, atau gunakan satu ParticleSystem yang dipicu dengan `Emit()` pada posisi tertentu:

```csharp
var emitParams = new ParticleSystem.EmitParams { position = hitPoint };
sparks.Emit(emitParams, 12);
```

Satu sistem, nol alokasi.

## Pitfall ringkas

1. Lupa reset state saat diambil dari pool.
2. Release ganda.
3. Pool tumbuh tanpa batas karena peluru tidak pernah dikembalikan (misal keluar layar). Beri batas umur atau cek di luar kamera.
4. Menyimpan referensi ke objek yang sudah dikembalikan; objek itu bisa dipakai untuk hal lain.
5. Pre-warm terlalu sedikit sehingga lonjakan `Instantiate` terjadi di tengah pertempuran. Warm-up di loading screen.
6. Event dan coroutine yang masih berjalan setelah objek dinonaktifkan: bersihkan di `OnDisable`.

## Alur kerja saya

1. Buka Profiler (`Window → Analysis → Profiler`), lihat modul **Memory** dan **CPU Usage** → `GC.Alloc`.
2. Temukan sumber alokasi per frame (`Deep Profile` kalau perlu).
3. Pool objek yang dibuat dan dihancurkan berulang.
4. Ukur lagi dan bandingkan.

## Penutup

Pooling adalah optimasi yang membosankan dan sangat efektif: tidak ada algoritma pintar, hanya memakai ulang. Pelajaran terbesar buat saya adalah **mengukur dulu**; saya tidak akan percaya bahwa `Instantiate` jadi masalah kalau Profiler tidak menunjukkannya.

Terima kasih Kak Arief yang membimbing sesi profiling saya.

Referensi: Unity Manual (*Object Pooling*, `UnityEngine.Pool.ObjectPool<T>`, *Profiler*).

<!--comments-->
arief_s: Percobaan sebelum dan sesudahnya yang paling berharga, Fajar. Orang sering melompat ke solusi tanpa angka. Satu koreksi: di Update peluru, hitung mundur memakai waktu per frame itu OK, tapi untuk ribuan peluru pertimbangkan satu manajer yang meng-update semuanya.
fajarnug: Terima kasih Kak. Saya catat untuk iterasi berikutnya.
gedesurya: Apakah ObjectPool bawaan thread-safe?
arief_s: Tidak, dan memang tidak perlu karena API Unity hanya boleh dari main thread.
bayu_w: Di Quest, GC spike lebih terasa lagi karena CPU mobile. Pooling hampir wajib untuk semua efek.
intanp: Warm-up di loading screen itu poin penting. Di VR, hitch di tengah pertempuran bikin mual.
rizkymaul: Saya dari web, dan ini mengingatkan pada connection pooling di database. Prinsipnya sama: biaya membuat lebih mahal daripada memakai ulang.
