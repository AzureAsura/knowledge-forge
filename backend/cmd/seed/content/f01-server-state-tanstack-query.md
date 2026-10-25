---
title: Server State vs Client State: Mengapa TanStack Query Mengubah Cara Kita Fetch Data
author: raka_m
category: web-frontend
difficulty: intermediate
status: published
age: 118
featured: true
cover: unsplash:1461749280684-dccba630e2f6
---

Hampir setiap proyek React yang saya review punya pola yang sama: komponen memanggil `fetch` di dalam `useEffect`, menyimpan hasilnya di `useState`, lalu menambahkan `isLoading`, `error`, dan kadang `retryCount` secara manual. Setelah tiga bulan, folder `hooks/` penuh dengan `useUsers`, `useUser`, `useUserPosts`, masing-masing menulis ulang logika yang hampir sama, dan masing-masing punya bug race condition yang sedikit berbeda.

Scroll ini menjelaskan satu ide yang menyelesaikan sebagian besar masalah itu: **server state bukan client state**. Begitu kamu memisahkannya, TanStack Query (dulu React Query) terasa bukan sebagai library tambahan, tapi sebagai bagian yang memang hilang.

![Kode di layar monitor](unsplash:1461749280684-dccba630e2f6)
*Data dari server punya siklus hidup yang berbeda dengan state UI. Memperlakukannya sama adalah sumber banyak bug.*

## Dua jenis state yang sering dicampur

| | Client state | Server state |
|---|---|---|
| Contoh | tab aktif, modal terbuka, isi input | daftar scroll, profil user, jumlah like |
| Pemilik | Browser (kamu) | Server / database |
| Sinkron? | Selalu | Bisa basi kapan saja |
| Dibagi antar user? | Tidak | Ya |
| Butuh | `useState`, `useReducer`, URL | cache, revalidasi, invalidasi |

Data dari server punya sifat yang tidak dimiliki state biasa:

1. **Kamu tidak memilikinya.** Yang kamu pegang hanyalah *snapshot*. Orang lain bisa mengubah datanya kapan saja.
2. **Ia diminta secara asinkron**, jadi selalu ada status *loading*, *error*, dan *success*.
3. **Ia bisa basi (stale)**. Pertanyaannya bukan "apakah data ini benar?" tapi "seberapa lama saya mau percaya data ini?".
4. **Ia dipakai di banyak tempat.** Halaman daftar, halaman detail, dan navbar mungkin menampilkan data yang sama.

Kalau semua ini ditulis tangan dengan `useEffect`, kamu sebenarnya sedang menulis *cache* kecil yang buggy.

## Masalah klasik `useEffect` + `useState`

```tsx
function Profile({ username }: { username: string }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/users/${username}`)
      .then((r) => r.json())
      .then(setUser)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [username])

  // ...
}
```

Kode ini terlihat wajar, tapi ada setidaknya lima masalah:

- **Race condition.** Ganti `username` dari `a` ke `b` dengan cepat; kalau respons `a` datang belakangan, UI menampilkan data `a` untuk halaman `b`.
- **Tidak ada pembatalan.** Request lama tetap berjalan setelah komponen unmount.
- **Tidak ada cache.** Kembali ke halaman yang sama berarti loading spinner lagi.
- **Tidak ada deduplikasi.** Dua komponen yang butuh data yang sama menembak server dua kali.
- **Tidak ada retry atau revalidasi.** Tab yang dibiarkan semalaman menampilkan data semalam.

## Cara TanStack Query memikirkannya

Query diidentifikasi oleh sebuah **query key**. Selama key-nya sama, datanya sama, dan cache dibagi.

```tsx
import { useQuery } from '@tanstack/react-query'

function Profile({ username }: { username: string }) {
  const { data, isPending, isError } = useQuery({
    queryKey: ['users', username],
    queryFn: ({ signal }) =>
      fetch(`/api/users/${username}`, { signal }).then((r) => r.json()),
  })

  if (isPending) return <Skeleton />
  if (isError) return <ErrorState />
  return <ProfileCard user={data} />
}
```

Perhatikan apa yang hilang: tidak ada `useEffect`, tidak ada tiga `useState`. Dan perhatikan apa yang *didapat gratis*:

- request dibatalkan lewat `signal` ketika key berubah atau komponen unmount;
- hasil di-cache berdasarkan key `['users', username]`;
- dua komponen dengan key yang sama menghasilkan satu request;
- data dianggap basi dan di-refetch otomatis pada kondisi tertentu (fokus jendela, reconnect, mount baru).

### Tiga istilah yang wajib dipahami

Di v5, ada beberapa nama yang berubah dari versi lama, dan banyak tutorial lama masih memakai nama lama:

- **`staleTime`**: berapa lama data dianggap *fresh*. Selama fresh, tidak ada refetch otomatis. Default-nya `0`, artinya data langsung dianggap basi.
- **`gcTime`**: berapa lama data yang tidak lagi dipakai (tidak ada komponen yang subscribe) disimpan di cache sebelum dibuang. Default 5 menit. Dulu bernama `cacheTime`.
- **`isPending`**: belum ada data sama sekali. `isLoading` sekarang berarti `isPending && isFetching`, yaitu request pertama yang sedang berjalan. Ini perbedaan yang sering membingungkan.

> Aturan praktis: `staleTime` menjawab "kapan saya refetch?", `gcTime` menjawab "kapan saya lupa?".

## Query key adalah dependency array-mu

Anggap query key sebagai dependency array `useEffect` yang dikelola otomatis. Semua variabel yang memengaruhi hasil harus ada di key:

```tsx
useQuery({
  queryKey: ['scrolls', { category, page, sort }],
  queryFn: () => api.getScrolls({ category, page, sort }),
})
```

Ganti `page` dan key berubah, sehingga query baru berjalan dan hasil lama tetap ada di cache. Kembali ke halaman 1 terasa instan karena datanya masih ada.

Susun key dari yang paling umum ke yang paling spesifik: `['scrolls']`, `['scrolls', 'list', {...}]`, `['scrolls', 'detail', id]`. Dengan begitu invalidasi bisa dilakukan berdasarkan prefix.

## Mutasi dan invalidasi

Membaca itu setengah cerita. Setengahnya lagi: setelah kamu mengubah data di server, bagian mana dari cache yang sekarang salah?

```tsx
const queryClient = useQueryClient()

const like = useMutation({
  mutationFn: (id: number) => api.like(id),
  onSuccess: (_data, id) => {
    queryClient.invalidateQueries({ queryKey: ['scrolls', 'detail', id] })
    queryClient.invalidateQueries({ queryKey: ['scrolls', 'list'] })
  },
})
```

`invalidateQueries` menandai query yang cocok sebagai basi. Query yang sedang tampil di layar langsung di-refetch; sisanya di-refetch saat dipakai lagi. Kamu tidak perlu tahu komponen mana yang menampilkan data itu.

### Optimistic update

Untuk interaksi yang harus terasa instan (like, bookmark), perbarui cache dulu, lalu rollback jika gagal:

```tsx
useMutation({
  mutationFn: api.like,
  onMutate: async (id) => {
    await queryClient.cancelQueries({ queryKey: ['scrolls', 'detail', id] })
    const previous = queryClient.getQueryData(['scrolls', 'detail', id])
    queryClient.setQueryData(['scrolls', 'detail', id], (old: Scroll) => ({
      ...old,
      isLiked: true,
      likesCount: old.likesCount + 1,
    }))
    return { previous }
  },
  onError: (_err, id, ctx) => {
    queryClient.setQueryData(['scrolls', 'detail', id], ctx?.previous)
  },
  onSettled: (_d, _e, id) => {
    queryClient.invalidateQueries({ queryKey: ['scrolls', 'detail', id] })
  },
})
```

Tiga langkah yang tidak boleh dilewat: **cancel** query yang sedang jalan (supaya tidak menimpa update optimistis), **simpan snapshot** untuk rollback, dan **invalidate** di `onSettled` supaya cache akhirnya sama dengan server.

## `queryOptions`: satu definisi, banyak pemakaian

Jangan menulis `queryKey` dan `queryFn` yang sama di banyak tempat. Gunakan helper `queryOptions`:

```tsx
import { queryOptions } from '@tanstack/react-query'

export const scrollQueries = {
  detail: (id: string) =>
    queryOptions({
      queryKey: ['scrolls', 'detail', id],
      queryFn: ({ signal }) => api.getScroll(id, { signal }),
      staleTime: 60_000,
    }),
}

// di komponen
const { data } = useQuery(scrollQueries.detail(id))
// di route loader
await queryClient.ensureQueryData(scrollQueries.detail(id))
// di tempat lain
queryClient.getQueryData(scrollQueries.detail(id).queryKey)
```

Keuntungannya: key dan fungsi tidak mungkin berbeda antar pemakaian, dan tipe data mengalir otomatis ke `getQueryData`.

![Dashboard analitik di laptop](unsplash:1551288049-bebda4e38f71)
*Dashboard yang sama muncul di tiga halaman? Satu query key, satu request, tiga tampilan.*

## Kapan TIDAK memakai TanStack Query

- State murni UI (modal, tab, input) tetap di `useState` atau URL.
- Filter dan pagination yang ingin bisa di-share: simpan di **URL search params**, lalu turunkan query key dari sana.
- Data yang benar-benar statis dan kecil bisa langsung di-import.
- Kebutuhan real-time sangat tinggi (chat, kursor kolaboratif) biasanya butuh WebSocket; TanStack Query bisa tetap dipakai sebagai penyimpan, tapi pemicu update-nya bukan polling.

## Checklist migrasi dari `useEffect` ke Query

1. Cari semua `useEffect` yang isinya `fetch`. Itu kandidat.
2. Tentukan query key dari variabel yang dipakai di dalamnya.
3. Pindahkan fetcher ke `queryFn`, teruskan `signal`.
4. Hapus `useState` untuk `data`, `loading`, `error`.
5. Untuk setiap aksi tulis, buat `useMutation` dan tentukan query mana yang harus di-invalidate.
6. Atur `staleTime` per jenis data. Profil jarang berubah (1–5 menit), feed sering berubah (10–30 detik).

## Penutup

Pergeseran mental ini lebih penting daripada API-nya: berhenti memperlakukan data server sebagai variabel milik komponen. Ia adalah cache bersama yang punya masa berlaku. TanStack Query memberi bahasa (key, stale, gc, invalidate) untuk membicarakannya, dan membuang ratusan baris kode `useEffect` yang tidak pernah benar-benar benar.

Referensi: dokumentasi resmi TanStack Query v5 (bagian *Important Defaults*, *Query Keys*, *Optimistic Updates*) dan panduan migrasi v4 ke v5.

<!--comments-->
dewilestari: Penjelasan tabel client state vs server state-nya jelas banget, Kak. Saya sebelumnya selalu simpan hasil fetch di useState dan bingung kenapa data di navbar dan di halaman profil sering tidak sinkron.
raka_m: Itu persis gejalanya, Dewi. Dua komponen, dua salinan state, dua kebenaran. Begitu dipindah ke satu query key, masalahnya hilang dengan sendirinya.
rizkymaul: Tambahan kecil: kalau pakai route loader (React Router), `ensureQueryData` bagus buat prefetch. Tapi hati-hati dengan data yang punya side-effect di server, jangan di-prefetch saat hover.
raka_m: Poin bagus, Rizky. Endpoint GET yang mencatat "sudah dibaca" itu contoh klasik. Prefetch hanya untuk GET yang benar-benar idempoten.
komang_adi: Dari sisi backend, jangan lupa kirim header cache yang benar juga. staleTime di client tidak menggantikan ETag atau Cache-Control di server.
putriayu: Saya desainer, tapi bagian optimistic update ini membantu saya paham kenapa tombol like di prototipe harus langsung berubah tanpa menunggu spinner. Terima kasih!
