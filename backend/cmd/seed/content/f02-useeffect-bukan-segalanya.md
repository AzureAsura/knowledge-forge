---
title: useEffect Bukan Tempat untuk Semuanya: Daftar Pengecualian yang Valid
author: raka_m
category: web-frontend
difficulty: intermediate
status: published
age: 23
featured: false
cover: unsplash:1542831371-29b0f74f9713
---

Dokumentasi React punya satu halaman yang judulnya jujur: *You Might Not Need an Effect*. Isinya satu pesan sederhana yang sulit dicerna oleh kebiasaan: **Effect adalah jalan keluar dari React, bukan jalur utama.** Effect dipakai untuk menyinkronkan komponen dengan sesuatu di luar React: DOM API, timer, koneksi jaringan, widget pihak ketiga.

Di code review minggu lalu saya menghitung 14 `useEffect` di satu halaman. Sebelas di antaranya bisa dihapus tanpa mengubah perilaku. Scroll ini adalah daftar pola yang saya temukan, kenapa itu masalah, dan ke mana kodenya sebaiknya pindah. Di bagian akhir ada daftar pengecualian yang *memang* valid.

![Kode SVG dan JSX di layar](unsplash:1542831371-29b0f74f9713)
*Setiap effect adalah render tambahan. Sering kali itu render yang tidak perlu terjadi.*

## Kenapa effect berbahaya

Alur dengan effect untuk "menurunkan" state:

1. React merender komponen dengan state lama.
2. Layar di-commit (pengguna sempat melihat nilai lama).
3. Effect jalan, memanggil `setState`.
4. React merender ulang dengan nilai baru.

Dua render, satu *flash* nilai yang salah, dan alur data yang sulit dibaca karena sebab dan akibat terpisah di dua tempat. Kalau ada rantai effect yang saling memicu, jumlah render bisa berlipat.

## Pola 1: menurunkan state dari state/props

```tsx
// ❌ state duplikat + effect
const [firstName, setFirstName] = useState('Dewi')
const [lastName, setLastName] = useState('Lestari')
const [fullName, setFullName] = useState('')

useEffect(() => {
  setFullName(firstName + ' ' + lastName)
}, [firstName, lastName])

// ✅ hitung saat render
const fullName = firstName + ' ' + lastName
```

Aturannya: **kalau sesuatu bisa dihitung dari props atau state yang ada, jangan jadikan ia state.** Hitung saat render. Kalau perhitungannya mahal, bungkus `useMemo`, bukan effect.

![Inspeksi elemen dan kode HTML di browser](unsplash:1517180102446-f3ece451e9d8)
*Inspeksi elemen dan kode HTML di browser.*

## Pola 2: mereset state saat prop berubah

```tsx
// ❌ reset lewat effect: satu render dengan komentar lama
function CommentForm({ scrollId }: { scrollId: number }) {
  const [text, setText] = useState('')
  useEffect(() => setText(''), [scrollId])
}

// ✅ beri key, React membuat instance baru
<CommentForm key={scrollId} scrollId={scrollId} />
```

Prop `key` adalah cara resmi untuk bilang "ini komponen yang berbeda". Semua state di dalamnya otomatis mulai dari nol, tanpa render kedua.

Untuk kasus yang lebih halus (mengubah *sebagian* state saat prop berubah), simpan nilai sebelumnya dan sesuaikan saat render, atau lebih baik: rancang ulang supaya tidak perlu.

## Pola 3: logika yang dipicu oleh aksi pengguna

```tsx
// ❌ efek samping ditaruh di effect karena "state berubah"
useEffect(() => {
  if (submitted) {
    toast.success('Tersimpan')
    navigate('/dashboard')
  }
}, [submitted])

// ✅ lakukan di event handler
async function handleSubmit() {
  await save()
  toast.success('Tersimpan')
  navigate('/dashboard')
}
```

Pertanyaan pembeda: **kenapa kode ini harus jalan?** Kalau jawabannya "karena pengguna menekan tombol", ia milik event handler. Kalau jawabannya "karena komponen ini tampil di layar", baru mungkin milik effect.

## Pola 4: fetch data

Fetch di effect tanpa pembatalan menghasilkan race condition: respons lama menimpa respons baru. Kalau kamu *harus* menulisnya sendiri, gunakan cleanup:

```tsx
useEffect(() => {
  const controller = new AbortController()
  fetch(`/api/scrolls/${id}`, { signal: controller.signal })
    .then((r) => r.json())
    .then(setScroll)
    .catch((e) => {
      if (e.name !== 'AbortError') setError(e)
    })
  return () => controller.abort()
}, [id])
```

Tapi untuk aplikasi nyata, gunakan library data (TanStack Query, atau loader dari framework/router). Cache, dedup, retry, dan revalidasi terlalu banyak untuk ditulis tangan. Lihat scroll *Server State vs Client State* di KnoFo.

## Pola 5: memberi tahu parent

```tsx
// ❌ child memanggil parent lewat effect
useEffect(() => {
  onChange(value)
}, [value, onChange])

// ✅ panggil di tempat nilai berubah
function handleInput(next: string) {
  setValue(next)
  onChange(next)
}
```

Lebih bagus lagi, angkat state ke parent (*lifting state up*) dan jadikan child komponen terkontrol.

## Pola 6: berlangganan store eksternal

Untuk sumber data di luar React (ukuran jendela, status online, store global), jangan tulis `useEffect` + `addEventListener` + `useState` sendiri. React punya `useSyncExternalStore`, yang menangani subscribe, snapshot yang konsisten, dan tearing saat concurrent rendering.

```tsx
function subscribe(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

function useOnlineStatus() {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true)
}
```

Perhatikan argumen ketiga: snapshot untuk server rendering.

## Pola 7: inisialisasi aplikasi satu kali

Kode yang harus jalan sekali saat aplikasi dimulai (baca token dari storage, set tema) tidak perlu `useEffect(..., [])`. Taruh di level modul, atau di inisialisasi `useState(() => ...)` kalau memang bagian dari state.

## Daftar pengecualian: effect yang VALID

Effect itu sah ketika komponen harus **tetap tersinkron dengan sistem eksternal selama ia tampil**:

| Kasus | Contoh |
|---|---|
| Event listener global | hotkey `⌘K`, `keydown` di `window` |
| Timer / interval | countdown, polling ringan |
| Integrasi library non-React | peta, chart canvas, editor |
| Koneksi jaringan persisten | WebSocket, EventSource |
| Kontrol DOM imperatif | `focus()`, mengukur elemen, `showModal()` |
| Analytics saat tampil | log "page viewed" |

Contoh yang valid, dengan cleanup yang benar:

```tsx
useEffect(() => {
  function onKey(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      searchRef.current?.focus()
    }
  }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
}, [])
```

Tiga hal yang selalu diperiksa pada effect yang valid: **dependency array lengkap**, **ada cleanup** kalau ada yang perlu dilepas, dan **aman dijalankan dua kali** (Strict Mode di development sengaja menjalankannya dua kali untuk membongkar bug cleanup).

## Alat bantu: tanyakan lima pertanyaan ini

1. Apakah nilai ini bisa dihitung dari state/props saat render? → hitung, jangan state.
2. Apakah ini dipicu oleh aksi pengguna? → event handler.
3. Apakah ini mereset state saat identitas berubah? → `key`.
4. Apakah ini data dari server? → library data / loader.
5. Apakah ini sinkronisasi dengan sistem di luar React? → baru boleh effect, **dengan cleanup**.

## Latihan

Ambil satu komponen di proyekmu yang punya lebih dari satu `useEffect`. Untuk tiap effect, tulis di komentar PR: *"sistem eksternal apa yang disinkronkan?"* Kalau tidak bisa menjawab, kemungkinan besar effect itu bisa dihapus.

Di aplikasi KnoFo sendiri, hanya ada satu `useEffect` di seluruh frontend (hotkey pencarian). Semua yang lain adalah derived state, event handler, `key`, URL search params, atau library data. Itu bukan kebetulan, itu hasil disiplin menjawab lima pertanyaan di atas.

<!--comments-->
dewilestari: Pola 2 (pakai key untuk reset form) mengubah hidup saya, Kak Raka. Sebelumnya saya selalu pakai effect untuk reset dan form-nya sempat menampilkan komentar lama sepersekian detik.
raka_m: Sering terjadi, Dewi. Kedipan itu persis render pertama sebelum effect jalan. Dengan key, tidak ada render antara.
rizkymaul: Pertanyaan: kalau kita memakai React Compiler, apakah pola derived state masih perlu perhatian khusus atau compiler membereskan semuanya?
raka_m: Compiler memoize otomatis, tapi tidak memperbaiki desain. State duplikat tetap state duplikat. Compiler membuat perhitungan murah, bukan membuat sumber kebenaran jadi satu.
komang_adi: Saya baru sadar kenapa fetch saya sering menampilkan data salah saat klik cepat antar halaman. Itu race condition dari pola 4, ya?
raka_m: Betul. Kalau mau tetap manual, wajib AbortController seperti contoh. Kalau tidak wajib manual, pakai library data.
citraang: Sebagai yang baru belajar React, tabel pengecualian di akhir ini penuh manfaat. Saya print dan tempel di meja.
