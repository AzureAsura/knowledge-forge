---
title: React Router v7 untuk Pemula: Loader, Action, dan Navigasi yang Terasa Instan
author: dewilestari
category: web-frontend
difficulty: beginner
status: published
age: 62
featured: false
cover: unsplash:1633356122544-f134324a6cee
---

Waktu pertama kali belajar React Router, saya hanya tahu `<Route path="/users" element={<Users />} />` dan `useNavigate`. Semua data saya ambil di dalam komponen. Hasilnya: pindah halaman, layar kosong sebentar, spinner, baru muncul isi. Rasanya seperti website tahun 2012.

Kak Raka menyuruh saya membaca tentang **data router** (loader dan action). Scroll ini adalah catatan belajar saya, ditulis dengan bahasa seorang pemula untuk pemula lain. Kalau ada yang salah, tolong dikoreksi di komentar ya!

![Logo React di layar editor kode](unsplash:1633356122544-f134324a6cee)
*Router bukan hanya tentang URL. Di v7, router juga mengatur kapan data diambil.*

## Dua cara memakai router

React Router punya beberapa "mode". Yang saya pakai di KnoFo adalah **data mode**: kita membuat router dengan `createBrowserRouter`, bukan `<BrowserRouter>` dengan `<Routes>` di JSX. Bedanya penting: dengan data mode, rute bisa punya `loader`, `action`, dan `errorElement`.

```tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Home /> },
      {
        path: 'scrolls/:slug',
        element: <ScrollDetail />,
        loader: scrollLoader,
      },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
```

## Loader: ambil data sebelum halaman tampil

Loader adalah fungsi yang dijalankan router **sebelum** merender rute. Komponen tidak perlu `useEffect` dan tidak perlu state loading sendiri.

```tsx
import type { LoaderFunctionArgs } from 'react-router-dom'
import { useLoaderData } from 'react-router-dom'

export async function scrollLoader({ params }: LoaderFunctionArgs) {
  const res = await fetch(`/api/scrolls/${params.slug}`)
  if (!res.ok) throw new Response('Not found', { status: 404 })
  return res.json()
}

function ScrollDetail() {
  const scroll = useLoaderData() as Scroll
  return <h1>{scroll.title}</h1>
}
```

Hal yang saya pelajari dengan cara susah:

- `params` berisi bagian dinamis URL (`:slug`).
- Kalau loader `throw` sebuah `Response`, router menampilkan `errorElement` rute itu. Tidak perlu `try/catch` di komponen.
- Loader jalan **paralel** untuk rute induk dan anak. Layout dan detail diambil bersamaan, bukan bergantian (menghilangkan "waterfall").

![Inspeksi elemen dan kode HTML di browser](unsplash:1517180102446-f3ece451e9d8)
*Inspeksi elemen dan kode HTML di browser.*

## Loader + TanStack Query = kombinasi enak

Mengembalikan data mentah dari loader berarti tidak ada cache. Kak Raka menyarankan pola ini: loader hanya **memanaskan cache** TanStack Query, dan komponen membaca dari query.

```tsx
export const scrollLoader = ({ params }: LoaderFunctionArgs) =>
  queryClient.ensureQueryData(scrollQueries.detail(params.slug!))

function ScrollDetail() {
  const { slug } = useParams()
  const { data } = useSuspenseQuery(scrollQueries.detail(slug!))
  return <h1>{data.title}</h1>
}
```

`ensureQueryData` mengembalikan data dari cache kalau sudah ada, jadi navigasi kedua ke halaman yang sama terasa instan. Dan karena komponen memakai `useSuspenseQuery`, `data` selalu ada (tidak perlu cek `undefined`).

## Action: menangani submit form

Action adalah pasangan loader untuk **menulis** data. Ia jalan ketika sebuah `<Form method="post">` di-submit.

```tsx
import { Form, redirect, type ActionFunctionArgs } from 'react-router-dom'

export async function createScrollAction({ request }: ActionFunctionArgs) {
  const form = await request.formData()
  const title = String(form.get('title') ?? '')
  if (title.length < 5) return { error: 'Judul minimal 5 karakter' }
  const scroll = await api.createScroll({ title })
  return redirect(`/scrolls/${scroll.slug}`)
}

function NewScroll() {
  return (
    <Form method="post">
      <input name="title" />
      <button type="submit">Simpan</button>
    </Form>
  )
}
```

Setelah action selesai, router **otomatis menjalankan ulang loader** halaman yang aktif, jadi data di layar ikut segar. Ini bagian yang bikin saya terkesan.

Di KnoFo sendiri kami memakai React Hook Form + zod dan `useMutation`, jadi tidak semua form memakai action. Pilih yang paling cocok: action bagus untuk form sederhana, `useMutation` bagus kalau butuh validasi kompleks dan optimistic update.

## Navigasi yang terasa instan

Tiga trik kecil:

1. **`<Link prefetch>`** (khusus framework mode) atau memanggil `queryClient.prefetchQuery` saat `onMouseEnter` untuk data yang aman diprefetch.
2. **`useNavigation()`** untuk tahu status navigasi (`idle`, `loading`, `submitting`) dan menampilkan progress bar tipis di atas halaman, bukan layar kosong.
3. **`<Suspense>` + skeleton** di layout supaya kerangka halaman langsung muncul saat data rute baru dimuat.

```tsx
function Layout() {
  const navigation = useNavigation()
  return (
    <>
      {navigation.state === 'loading' && <TopProgress />}
      <Suspense fallback={<PageSkeleton />}>
        <Outlet />
      </Suspense>
    </>
  )
}
```

## URL sebagai state

Pelajaran terbesar dari proyek ini: **filter, tab, dan halaman sebaiknya hidup di URL**, bukan `useState`. Dengan `useSearchParams`, tombol Back berfungsi, link bisa dibagikan, dan refresh tidak menghilangkan filter.

```tsx
const [params, setParams] = useSearchParams()
const page = Number(params.get('page') ?? 1)
const category = params.get('category') ?? 'all'

function setCategory(next: string) {
  setParams((p) => {
    p.set('category', next)
    p.set('page', '1')
    return p
  })
}
```

Saya sempat membuat filter dengan `useState` dan baru sadar waktu user klik detail lalu Back: filternya reset. Setelah pindah ke URL, masalah itu hilang.

## Rute yang dilindungi (guard)

Loader juga cocok untuk memeriksa login. Kalau belum login, lempar `redirect`:

```tsx
export async function requireAuth() {
  const me = await queryClient.ensureQueryData(meQuery)
  if (!me) throw redirect('/login')
  return me
}
```

Pasang `loader: requireAuth` di rute induk dashboard, dan semua rute anak otomatis terlindungi sebelum komponennya dirender. Tidak ada kedipan halaman yang seharusnya tidak terlihat.

## Kesalahan pemula yang saya buat

| Kesalahan | Akibat | Perbaikan |
|---|---|---|
| Fetch di komponen dan loader sekaligus | Request dobel | Pilih satu: loader memanaskan cache |
| Lupa `errorElement` | Layar putih saat loader gagal | Pasang di rute induk |
| `useLoaderData` tanpa tipe | `any` di mana-mana | Beri tipe, atau pakai query hook bertipe |
| Mengubah URL manual dengan `window.location` | Reload penuh | Pakai `Link` / `navigate` |
| State filter di `useState` | Back dan refresh menghilangkan filter | `useSearchParams` |

## Penutup

Dulu saya mengira router hanya "peta URL ke komponen". Sekarang saya melihatnya sebagai tempat yang menjawab dua pertanyaan: *halaman apa?* dan *data apa yang dibutuhkan halaman itu sebelum tampil?* Dengan loader, pertanyaan kedua tidak lagi bocor ke setiap komponen.

Terima kasih pada Kak Raka untuk review draf pertamanya.

<!--comments-->
raka_m: Bagus sekali catatannya, Dewi. Saya suka bagian tabel kesalahan pemula, jujur dan berguna. Satu koreksi kecil: `throw redirect()` di guard memang benar, tapi pastikan loader anak tidak ikut jalan lebih dulu kalau datanya butuh auth. Urutan loader paralel itu pedang bermata dua.
dewilestari: Terima kasih Kak! Berarti guard sebaiknya di rute induk saja ya, dan loader anak mengandalkan hasilnya lewat cache `me`?
raka_m: Tepat. Cache `me` yang dipanaskan guard jadi sumber kebenaran untuk anak-anaknya.
rizkymaul: Boleh tambahan: `useSearchParams` dengan `replace: true` berguna untuk perubahan filter beruntun supaya history tidak penuh.
putriayu: Saya mau tanya dari sisi desain: progress bar tipis saat navigasi itu bisa kita sepakati warnanya dengan brand biru, kan? Nanti saya kirim spesifikasinya.
dewilestari: Boleh banget Putri! Tinggal kirim token warnanya.
citraang: Terima kasih Kak Dewi, ini yang saya cari-cari. Saya baru di tim dan routing di KnoFo masih membingungkan. Sekarang jadi jelas kenapa tidak ada useEffect di halaman detail.
