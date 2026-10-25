---
title: Code Review yang Sehat: Panduan untuk Reviewer dan Author
author: raka_m
category: project-management
difficulty: intermediate
status: published
age: 16
featured: false
cover: unsplash:1551434678-e076c223a692
---

Code review bisa menjadi sumber pembelajaran terbesar di tim atau sumber gesekan terbesar. Perbedaannya hampir tidak pernah soal kemampuan teknis; ia soal **kebiasaan dan ekspektasi bersama**. Di Palm Studio, kami pernah punya PR yang menunggu review selama empat hari, komentar bernada "kenapa kamu menulis ini?", dan author yang berhenti mengirim PR kecil karena takut dihujani komentar.

Scroll ini adalah kesepakatan yang kami tulis setelah retrospektif tentang hal itu: tujuan review, apa yang diperiksa, bagaimana menulis komentar yang membantu, ukuran PR yang sehat, dan SLA waktu. Ditulis untuk dua peran: **author** dan **reviewer**.

![Dua pengembang bekerja bersama di depan laptop](unsplash:1551434678-e076c223a692)
*Review bukan ujian untuk author, tapi kerja sama untuk membuat kode (dan orang) lebih baik.*

## Tujuan review

Urutan prioritasnya:

1. **Kebenaran**: apakah kode melakukan yang seharusnya, termasuk kasus tepi dan error?
2. **Keamanan dan data**: apakah ada risiko kebocoran, injeksi, kehilangan data, atau pelanggaran izin?
3. **Desain**: apakah cocok dengan arsitektur, tidak menambah kompleksitas tanpa alasan?
4. **Keterbacaan dan perawatan**: bisakah orang lain memahami dan mengubahnya enam bulan lagi?
5. **Tes**: apakah perilaku penting terlindungi?
6. **Gaya**: serahkan ke linter dan formatter; jangan buang waktu manusia untuk titik koma.

Review yang baik menyaring bug, menyebarkan pengetahuan, dan menjaga konsistensi. Review yang buruk memperlambat tanpa menambah mutu.

## Untuk author: membuat PR mudah direview

**Ukuran.** PR kecil lebih cepat direview dan lebih sedikit bug. Panduan kami: ≤ 300 baris perubahan bermakna, satu tujuan per PR. Jika fitur besar, pecah menjadi urutan PR kecil (refactor dulu, lalu fitur; atau di balik feature flag).

**Deskripsi.** Template yang kami pakai:

```markdown
![Tim berdiskusi di ruang kerja](unsplash:1522071820081-009f0129c71c)
*Tim berdiskusi di ruang kerja.*

## Apa & kenapa
Satu atau dua kalimat: masalah apa yang diselesaikan.

## Perubahan
- Poin-poin perubahan utama

## Cara menguji
1. Langkah yang bisa diikuti reviewer
2. Hasil yang diharapkan

## Catatan untuk reviewer
Bagian yang saya ragukan / minta perhatian khusus

## Screenshot / rekaman (jika UI)
```

**Review diri sendiri dulu.** Baca diff seolah kamu reviewer. Hapus kode debug, komentar TODO tak terpakai, dan perubahan tidak relevan. Kamu akan menemukan sepertiga masalah sebelum orang lain melihatnya.

**Pastikan CI hijau** sebelum meminta review. Jangan menghabiskan waktu manusia pada kegagalan yang bisa dideteksi mesin.

**Terima komentar sebagai informasi.** Jangan defensif; kalau tidak setuju, jelaskan alasanmu dengan tenang. Jika terjadi bolak-balik lebih dari dua putaran, pindah ke panggilan singkat.

## Untuk reviewer: apa yang diperiksa

Daftar periksa praktis:

| Area | Pertanyaan |
|---|---|
| **Kebenaran** | Apakah logika benar untuk input kosong, null, sangat besar, duplikat? |
| **Error** | Apakah kegagalan ditangani, dilog, dan tidak ditelan diam-diam? |
| **Konkurensi** | Ada race condition? Operasi baca-lalu-tulis yang harus atomik? |
| **Keamanan** | Input divalidasi? Autorisasi diperiksa di server? Tidak ada secret di kode? |
| **Performa** | Ada query di dalam loop (N+1)? Daftar tanpa batas? |
| **API** | Perubahan merusak klien yang ada? Nama dan kontrak jelas? |
| **Tes** | Kasus utama dan kasus tepi terlindungi? Tes benar-benar menguji perilaku? |
| **Keterbacaan** | Nama jelas? Fungsi satu tanggung jawab? Komentar menjelaskan *kenapa*? |
| **Konsistensi** | Mengikuti pola di bagian lain kode? |

Tips: **jalankan kodenya** untuk perubahan yang berisiko; membaca tidak selalu cukup. Lihat file di sekitar diff untuk memahami konteks, bukan hanya baris yang berubah.

## Menulis komentar yang membantu

Aturan terpenting: **kritik kode, bukan orang**, dan jelaskan alasan.

| Kurang baik | Lebih baik |
|---|---|
| "Ini salah." | "Kalau `items` kosong, `items[0]` akan panic. Bisa tambah pengecekan panjang?" |
| "Kenapa kamu menulis ini?" | "Aku belum paham alasan memakai goroutine di sini. Apa ada batasan yang membuatnya perlu?" |
| "Pakai nama yang bagus." | "Nama `data` kurang spesifik; `pendingScrolls` akan membuat alurnya lebih jelas." |
| "Harusnya begini." | "Saran: `errors.Is(err, ErrNotFound)` agar tetap cocok kalau error dibungkus." |
| "Jelek." | (hapus; tidak ada informasi) |

Gunakan **label tingkat** agar author tahu mana yang wajib:

- `blocker:` harus diperbaiki sebelum merge (bug, keamanan).
- `suggestion:` / `nit:` opsional (gaya, preferensi); jangan menahan merge.
- `question:` butuh penjelasan, bukan perubahan.
- `praise:` hal bagus yang layak dicatat. Ya, ini penting; review yang hanya berisi kritik menurunkan semangat.

Tanya sebelum menuduh: "Apakah ada alasan untuk X?" sering membuka konteks yang tidak kamu lihat.

Satu komentar, satu masalah. Dan jangan mengomentari hal yang sama di sepuluh tempat; sebut sekali dan tulis "berlaku untuk semua kemunculan".

## SLA waktu

Review yang lambat adalah biaya tersembunyi terbesar: konteks hilang, konflik merge bertambah, dan author berpindah tugas.

| Aturan | Nilai kami |
|---|---|
| Respons pertama | ≤ 1 hari kerja |
| PR kecil (< 100 baris) | Review di hari yang sama |
| Putaran review | Maksimal 2–3 |
| Reviewer | Minimal 1 (2 untuk perubahan keamanan/skema DB) |
| PR menunggu > 2 hari | Ping di channel tim |

Tidak ada yang menunggu sendirian: jika reviewer sibuk, ia berkata begitu dan mengalihkan.

## Siapa yang mereview apa

- **Rotasi** reviewer agar pengetahuan menyebar dan tidak ada titik tunggal.
- Perubahan yang menyentuh area spesifik (auth, pembayaran, skema DB) wajib dilihat pemilik area.
- **Senior mereview junior bukan hanya untuk menemukan salah**, tapi untuk mengajar; **junior mereview senior** pun dianjurkan: pertanyaan "kenapa begini?" dari orang baru sering membuka asumsi tersembunyi.
- Author tidak menyetujui PR-nya sendiri. (Aturan itu juga berlaku di KnoFo: scroll tidak bisa disetujui oleh penulisnya.)

## Otomatisasi

Serahkan yang mekanis ke mesin:

- Formatter (gofmt, Prettier) dan linter (golangci-lint, oxlint) di CI dan pre-commit.
- Tes otomatis, pemindaian dependensi, dan pemeriksaan ukuran bundle.
- Bot yang memberi label ukuran PR dan mengingatkan PR yang menunggu.

Dengan begitu komentar manusia fokus pada desain dan kebenaran.

## Sinyal bahwa budaya review tidak sehat

| Gejala | Kemungkinan akar |
|---|---|
| PR berhari-hari tanpa respons | Tidak ada SLA, beban tidak merata |
| Banyak komentar gaya | Tidak ada formatter/linter |
| Author berhenti membuat PR kecil | Takut komentar keras |
| Reviewer hanya mengetik "LGTM" | Tidak ada waktu atau ekspektasi |
| Debat panjang di komentar | Perlu panggilan singkat atau standar tertulis |
| PR sangat besar | Tidak ada kebiasaan memecah |

## Checklist ringkas

**Author:** PR kecil, deskripsi jelas, CI hijau, review diri, terbuka terhadap masukan.

**Reviewer:** respons cepat, prioritaskan kebenaran dan keamanan, komentar spesifik dengan alasan, beri label tingkat, sertakan pujian, jangan sekadar LGTM.

## Penutup

Tujuan akhir review bukan kode sempurna, tapi **kode yang cukup baik hari ini dan tim yang makin pintar besok**. Kalau setelah sebuah review author merasa lebih paham dan reviewer merasa belajar sesuatu, prosesnya sehat.

Referensi: panduan *Google Engineering Practices: Code Review*, *The Standard of Code Review*, dan artikel *Conventional Comments*.

<!--comments-->
dewilestari: Saya dulu takut mengirim PR karena komentar yang terasa menghakimi. Pedoman 'kritik kode, bukan orang' dan label nit/blocker membuat saya lebih tenang.
raka_m: Itu persis alasan kami menulisnya, Dewi. Dan jangan ragu bertanya kalau label tidak jelas.
sari_dewi: Satu tambahan dari backend: untuk perubahan skema database, wajib dua reviewer dan sertakan rencana rollback di deskripsi PR.
kevin_h: Saya setuju. Ditambahkan ke Definition of Done. SLA satu hari kerja juga saya taruh di working agreement tim.
komang_adi: Praise label itu ide bagus. Kemarin Kak Sari menulis 'bagus, terima kasih sudah menambah tes' dan itu membuat saya semangat.
rizkymaul: Soal PR kecil: bagaimana dengan refactor besar yang tidak bisa dipecah?
raka_m: Biasanya masih bisa: pindahkan file dulu (tanpa perubahan logika), lalu ubah logika. Dua PR kecil lebih mudah direview daripada satu raksasa. Kalau benar-benar tidak bisa, jadwalkan sesi review bersama.
citraang: Sebagai desainer, saya penasaran apakah pola 'review diri sendiri' bisa dipakai untuk desain di Figma juga.
maya_kusuma: Tentu, Citra. Kita sebut desain crit mandiri; scroll berikutnya akan membahasnya.
