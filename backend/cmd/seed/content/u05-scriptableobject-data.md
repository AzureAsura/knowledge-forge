---
title: ScriptableObject sebagai Data Gameplay: Berhenti Menaruh Angka di Prefab
author: gedesurya
category: unity-2d
difficulty: intermediate
status: published
age: 24
featured: false
cover: unsplash:1538481199705-c710c4e965fc
---

Waktu saya pindah dari tim VR ke proyek game 2D, saya menemukan satu prefab musuh yang punya 23 field di Inspector: HP, kecepatan, damage, cooldown, warna, suara, drop item. Ada 14 varian musuh, dan setiap kali designer ingin menyeimbangkan, mereka harus membuka 14 prefab satu-satu. Dua kali ada yang lupa menyimpan, dan versi yang salah masuk ke build.

Solusinya sudah ada di Unity sejak lama dan sering diabaikan pemula: **ScriptableObject**. Scroll ini menjelaskan apa itu, kenapa ia memisahkan *data* dari *perilaku* dengan bersih, dan tiga pola yang kami pakai di proyek: data statis, *runtime set*, dan *event channel*.

![Keyboard gaming dengan lampu warna-warni](unsplash:1538481199705-c710c4e965fc)
*Angka keseimbangan seharusnya bisa diubah designer tanpa menyentuh scene atau prefab.*

## Apa itu ScriptableObject

`ScriptableObject` adalah kelas yang instansinya berupa **aset** di folder proyek (`.asset`), bukan komponen di GameObject. Ia menyimpan data yang bisa diedit di Inspector, dipakai bersama oleh banyak objek, dan dimuat tanpa harus berada di scene.

```csharp
using UnityEngine;

[CreateAssetMenu(menuName = "Game/Enemy Definition", fileName = "NewEnemy")]
public class EnemyDefinition : ScriptableObject
{
    [Header("Stats")]
    public int maxHealth = 3;
    public float moveSpeed = 2f;
    public int contactDamage = 1;

    [Header("Presentation")]
    public Sprite sprite;
    public AudioClip hurtSound;

    [Header("Rewards")]
    public int scoreValue = 100;
    public GameObject dropPrefab;
}
```

Klik kanan di Project → `Create → Game → Enemy Definition` untuk membuat aset `Slime.asset`, `Bat.asset`, `Skeleton.asset`. Designer menyunting angka di aset itu; programmer tidak perlu terlibat.

## Prefab yang menunjuk data

Sekarang prefab musuh hanya **satu**, dan perilakunya membaca definisi:

```csharp
public class Enemy : MonoBehaviour
{
    [SerializeField] private EnemyDefinition definition;
    private int health;

    private void Awake()
    {
        health = definition.maxHealth;
        GetComponent<SpriteRenderer>().sprite = definition.sprite;
    }

    public void TakeDamage(int amount)
    {
        health -= amount;
        if (health <= 0) Die();
    }

    private void Die()
    {
        GameScore.Add(definition.scoreValue);
        if (definition.dropPrefab) Instantiate(definition.dropPrefab, transform.position, Quaternion.identity);
        Destroy(gameObject);
    }
}
```

Keuntungan langsung:

| Sebelum | Sesudah |
|---|---|
| 14 prefab, masing-masing 23 field | 1 prefab + 14 aset data kecil |
| Menyeimbangkan = buka 14 prefab | Menyeimbangkan = ubah 1 aset (bisa multi-select) |
| Perubahan data bercampur dengan perubahan scene di Git | Aset data punya diff kecil dan bersih |
| Designer perlu akses scene | Designer cukup menyunting aset |

![Perangkat game retro](unsplash:1550745165-9bc0b252726f)
*Perangkat game retro.*

## Jebakan nomor satu: mengubah aset saat runtime

ScriptableObject adalah aset bersama. Kalau `Enemy` mengubah `definition.maxHealth--` untuk melacak HP, **semua musuh jenis itu ikut berubah**, dan di Editor perubahan itu *tetap tersimpan* setelah Play dihentikan (di build tidak, yang membuat bug berbeda antara Editor dan build!).

Aturan: **ScriptableObject adalah data baca-saja saat game berjalan.** State yang berubah (`health`) disimpan di komponen (`Enemy.health`) atau di kelas runtime terpisah.

Kalau memang butuh salinan yang bisa diubah, buat instans runtime:

```csharp
var runtime = Instantiate(definition);   // salinan, aset asli aman
```

## Pola 2: Runtime Set (daftar objek aktif)

Pertanyaan umum: "bagaimana menara tahu semua musuh yang sedang hidup tanpa `FindObjectsOfType` tiap frame?" Jawab dengan ScriptableObject yang berisi daftar:

```csharp
[CreateAssetMenu(menuName = "Game/Runtime Set/Enemies")]
public class EnemySet : ScriptableObject
{
    private readonly List<Enemy> items = new();
    public IReadOnlyList<Enemy> Items => items;

    public void Add(Enemy e)    { if (!items.Contains(e)) items.Add(e); }
    public void Remove(Enemy e) { items.Remove(e); }
}

// di Enemy:
[SerializeField] private EnemySet activeEnemies;
private void OnEnable()  => activeEnemies.Add(this);
private void OnDisable() => activeEnemies.Remove(this);
```

Menara cukup mereferensikan aset `EnemySet` yang sama dan tidak perlu mengenal `EnemySpawner`. Tidak ada singleton, tidak ada `Find`.

Perhatikan: daftar ini *state runtime* di dalam ScriptableObject. Itu boleh untuk daftar referensi yang dikosongkan saat game mulai (`OnEnable`/`OnDisable`), tapi jangan sampai data **desain** tercampur dengan data runtime di aset yang sama.

## Pola 3: Event Channel (komunikasi tanpa kopling)

Ketika pemain mati, UI harus menampilkan layar game over, musik berganti, dan skor dikirim. Kalau `Player` langsung memanggil ketiganya, ia terkopling ke semuanya. Gunakan aset event:

```csharp
[CreateAssetMenu(menuName = "Game/Events/Void Event")]
public class VoidEventChannel : ScriptableObject
{
    public event System.Action Raised;
    public void Raise() => Raised?.Invoke();
}

// Player:
[SerializeField] private VoidEventChannel onPlayerDied;
private void Die() => onPlayerDied.Raise();

// GameOverUI:
[SerializeField] private VoidEventChannel onPlayerDied;
private void OnEnable()  => onPlayerDied.Raised += Show;
private void OnDisable() => onPlayerDied.Raised -= Show;
```

`Player` tidak tahu siapa yang mendengar. Menambahkan pendengar baru (achievement, analytics) tidak menyentuh `Player` sama sekali. **Selalu lepas langganan di `OnDisable`**, supaya tidak ada pemanggilan ke objek yang sudah dihancurkan.

## Kapan JANGAN memakai ScriptableObject

- **Save game**: data yang berubah per pemain dan harus disimpan di disk. Pakai JSON/binary; ScriptableObject tidak persisten di build untuk perubahan runtime.
- **Data yang dihitung dari scene** dan hanya relevan untuk satu objek.
- **Satu-satunya pemakai.** Jika hanya ada satu musuh unik, field di komponen cukup. Jangan membuat aset untuk satu objek.

## Praktik rapi

1. **Folder** yang jelas: `Assets/Data/Enemies/`, `Assets/Data/Events/`.
2. **Validasi di `OnValidate`** agar angka konyol tertangkap di Editor:

```csharp
private void OnValidate()
{
    maxHealth = Mathf.Max(1, maxHealth);
    moveSpeed = Mathf.Max(0f, moveSpeed);
}
```

3. **Addressables/Resources** hanya jika aset dimuat dinamis; referensi langsung dari Inspector lebih sederhana dan aman.
4. **Penamaan** konsisten: `EnemyDefinition`, `WeaponDefinition`, bukan `EnemyData2`.
5. **Dokumentasikan** bidang dengan `[Tooltip]` supaya designer paham satuannya (detik? unit/detik?).

## Alur kerja tim

Sejak pindah ke pendekatan ini, designer kami (Maya dan Salsa, saat membantu) bisa menyeimbangkan musuh di sore hari tanpa meminta saya membuka Unity. Kami juga menaruh aset data dalam PR terpisah dari kode sehingga review kode tidak dipenuhi perubahan angka.

## Ringkasan

- ScriptableObject = data sebagai aset, dibagi antar objek, bisa disunting designer.
- Pisahkan *definisi* (aset, read-only saat runtime) dari *state* (komponen).
- Runtime Set menggantikan `Find`; Event Channel menggantikan referensi langsung antar sistem.
- Jangan ubah aset saat game berjalan, dan jangan pakai untuk save game.

Referensi: Unity Manual (*ScriptableObject*), presentasi Ryan Hipple *Game Architecture with ScriptableObjects* (Unite Austin 2017).

<!--comments-->
arief_s: Bagus, Gede. Jebakan "aset berubah tersimpan di Editor tapi tidak di build" memang sumber bug hantu. Saya tambahkan satu: untuk Runtime Set, kosongkan list di OnEnable aset supaya sisa dari sesi Play sebelumnya (dengan domain reload mati) tidak terbawa.
gedesurya: Terima kasih Kak. Saya tidak tahu soal domain reload mati; saya periksa setting proyek kita.
fajarnug: Event Channel-nya bagus untuk UI game over. Selama ini Player saya memegang referensi ke tiga manager sekaligus.
maya_kusuma: Dari sisi desain, kemampuan menyeimbangkan di aset tanpa menyentuh prefab itu sangat berarti. Bisa kita buat template untuk item dan skill juga?
gedesurya: Bisa Kak Maya, polanya sama. Saya buatkan contoh WeaponDefinition minggu depan.
bayu_w: Kita pakai pola ini juga di tim VR untuk setting kenyamanan: aset ComfortProfile yang dipilih pemain. Sangat membantu.
