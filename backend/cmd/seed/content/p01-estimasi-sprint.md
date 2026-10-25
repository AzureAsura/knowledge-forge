---
title: Estimasi Sprint yang Jujur: Dari Story Point ke Forecast Berbasis Data
author: kevin_h
category: project-management
difficulty: intermediate
status: published
age: 120
featured: true
cover: unsplash:1454165804606-c3d57bc86b40
---

Tiga tahun lalu, saya menjanjikan sebuah fitur kepada klien dalam dua minggu. Estimasinya datang dari rapat singkat dengan tim: "Kira-kira dua minggu lah." Fitur itu selesai dalam enam minggu. Bukan karena tim malas; kami hanya tidak tahu apa yang tidak kami ketahui.

Sejak itu saya mengubah cara tim kami berbicara tentang estimasi. Scroll ini merangkum apa yang kami pelajari: kenapa estimasi hampir selalu terlalu optimis, bagaimana story point seharusnya dipakai (dan disalahgunakan), dan bagaimana beralih dari "tebakan" ke **forecast berbasis data** memakai velocity, cycle time, dan simulasi sederhana.

![Rapat tim di meja dengan laptop dan catatan](unsplash:1454165804606-c3d57bc86b40)
*Estimasi bukan janji. Ia adalah pernyataan tentang ketidakpastian yang dibagikan kepada orang lain.*

## Kenapa kita selalu terlalu optimis

Beberapa bias yang konsisten muncul:

| Bias | Penjelasan | Contoh |
|---|---|---|
| **Planning fallacy** | Kita membayangkan skenario terbaik dan lupa gangguan | "Tinggal buat form, sehari." Lupa validasi, error, desain ulang, review |
| **Anchoring** | Angka pertama yang disebut memengaruhi semua | Senior bilang "3 hari", yang lain mengikuti |
| **Unknown unknowns** | Hal yang tidak kita tahu belum kita ketahui | API pihak ketiga ternyata berperilaku berbeda |
| **Tekanan sosial** | Tidak enak menyebut angka besar | Estimasi diturunkan agar disetujui |
| **Mengabaikan pekerjaan selain koding** | Review, testing, deploy, rapat | "2 hari koding" menjadi 5 hari kalender |

Kabar baiknya: bias ini dapat dikelola dengan data historis dan format estimasi yang tepat.

## Story point: apa dan bukan apa

**Story point** adalah ukuran *relatif* dari usaha, kompleksitas, dan ketidakpastian sebuah item pekerjaan, bukan jam. Tim membandingkan item baru dengan item referensi: "ini sekitar dua kali lebih rumit dari tiket login itu".

Kegunaan yang benar:

- Membandingkan ukuran relatif tanpa debat jam.
- Mengukur kapasitas tim lewat **velocity** (jumlah point yang selesai per sprint).
- Memicu diskusi ketika estimasi berbeda jauh (satu orang bilang 2, yang lain 13 berarti ada asumsi berbeda).

Kesalahan yang sering terjadi:

1. **Mengonversi point ke jam** ("1 point = 4 jam"). Itu menghilangkan alasan point ada.
2. **Membandingkan velocity antar tim.** Skalanya berbeda per tim.
3. **Menjadikan velocity target kinerja.** Begitu diukur sebagai target, tim akan menggelembungkan point.
4. **Mengestimasi pekerjaan yang belum dipahami.** Item yang belum jelas perlu *spike* (penelitian berbatas waktu), bukan angka.

Skala yang kami pakai: urutan Fibonacci terbatas (1, 2, 3, 5, 8, 13). Item **13 ke atas harus dipecah**. Makin besar item, makin lebar ketidakpastiannya, dan skala yang melonjak mencerminkan itu.

![Tim berdiskusi di ruang kerja](unsplash:1522071820081-009f0129c71c)
*Tim berdiskusi di ruang kerja.*

## Planning Poker yang berguna

1. Product owner menjelaskan item; tim bertanya.
2. Semua orang memilih kartu **secara bersamaan** (menghindari anchoring).
3. Jika estimasi berbeda jauh, **orang dengan angka tertinggi dan terendah menjelaskan asumsinya**.
4. Ulangi sampai konvergen; jika tidak, pecah item atau buat spike.

Nilai terbesarnya bukan angka akhir, tapi **percakapan** yang mengungkap asumsi tersembunyi: "oh, kamu mengira kita pakai library itu?".

## Definisi item yang siap diestimasi

Item yang masuk estimasi sebaiknya memenuhi kriteria **INVEST**:

- **I**ndependent: tidak terlalu bergantung pada item lain.
- **N**egotiable: detail bisa dibahas.
- **V**aluable: ada nilai bagi pengguna.
- **E**stimable: cukup jelas untuk diestimasi.
- **S**mall: muat dalam satu sprint, idealnya ≤ 3 hari.
- **T**estable: ada kriteria selesai yang jelas.

Dan **Definition of Done** yang eksplisit: kode ter-review, tes lulus, dokumentasi diperbarui, sudah di staging, disetujui PO. Estimasi tanpa DoD yang disepakati berarti tiap orang mengestimasi pekerjaan berbeda.

## Dari velocity ke forecast

Velocity rata-rata memberi gambaran awal. Misalkan enam sprint terakhir: 21, 18, 25, 20, 23, 19 point. Rata-rata 21,0 point.

Backlog sisa 120 point:

```
sprint_tersisa = 120 / 21 ≈ 5,7 sprint ≈ 6 sprint
```

Tapi satu angka memberi rasa aman palsu. Gunakan **rentang**:

| Skenario | Velocity | Hasil |
|---|---|---|
| Pesimis (rendah) | 18 | 120 / 18 = 6,7 → 7 sprint |
| Rata-rata | 21 | 5,7 → 6 sprint |
| Optimis (tinggi) | 25 | 4,8 → 5 sprint |

Komunikasikan: **"5 sampai 7 sprint, kemungkinan terbesar 6."** Itu pernyataan jujur, dan klien dapat merencanakan dengan rentang itu.

## Monte Carlo sederhana: forecast dengan probabilitas

Alih-alih rata-rata, **simulasikan** ribuan kemungkinan masa depan dengan mengambil sampel acak dari velocity historis.

```python
import random

velocities = [21, 18, 25, 20, 23, 19]
backlog = 120
runs = 10_000

results = []
for _ in range(runs):
    done, sprints = 0, 0
    while done < backlog:
        done += random.choice(velocities)
        sprints += 1
    results.append(sprints)

results.sort()
p50 = results[int(runs * 0.50)]
p85 = results[int(runs * 0.85)]
p95 = results[int(runs * 0.95)]
print(f"50%: {p50} sprint, 85%: {p85}, 95%: {p95}")
```

Hasil dari data di atas: `50%: 6, 85%: 6, 95%: 7`. Artinya: "Ada 85% kemungkinan selesai dalam 6 sprint atau kurang, dan 95% dalam 7." Itu bahasa yang berguna bagi pemangku kepentingan, karena mereka memilih tingkat risiko mereka sendiri.

Variasi: gunakan **throughput** (jumlah item selesai per minggu) dan **cycle time** (hari dari mulai sampai selesai) tanpa story point sama sekali. Beberapa tim menemukan bahwa menghitung jumlah item (setelah dipecah kecil) hampir sama akuratnya dengan point dan jauh lebih murah.

## Cycle time: pertanyaan yang lebih jujur

**Cycle time** adalah waktu dari item mulai dikerjakan sampai selesai. Dari data historis kamu bisa berkata: "85% item selesai dalam 6 hari atau kurang." Itu menjawab pertanyaan klien ("kapan fitur ini selesai?") dengan data nyata.

Cara mengumpulkan: catat tanggal pindah ke *In Progress* dan *Done* (Jira, Linear, GitHub Projects sudah menyediakan). Buat histogram; lihat persentil ke-50, 85, 95.

## Buffer dan ketergantungan

- **Jangan menambah buffer di setiap item.** Padding tersembunyi di tiap tugas akan terpakai (hukum Parkinson). Tambahkan buffer di **level proyek** atau rilis.
- Pelacakan **ketergantungan eksternal** (desain, API pihak ketiga, persetujuan klien) terpisah, karena di luar kendali tim.
- Sisihkan kapasitas untuk **pekerjaan tidak terencana**: bug, dukungan, insiden. Kami menyisihkan 15–20% kapasitas sprint.

## Komunikasi ke klien dan manajemen

Format yang kami pakai di status mingguan:

```
Fitur: Notifikasi email
Status: On track
Forecast: rilis 14–28 Mei (85% yakin sebelum 28 Mei)
Risiko: Persetujuan template email dari klien (belum diterima)
Perubahan sejak minggu lalu: +1 item (reminder), tanggal tidak berubah
```

Hal yang kami hindari: tanggal tunggal tanpa rentang, "hampir selesai" tanpa definisi, dan menyembunyikan kabar buruk. Kabar buruk yang dilaporkan lebih awal selalu lebih murah daripada kabar buruk yang ditemukan di hari terakhir.

## Memulai di tim kecil dalam tiga sprint

1. **Sprint 1**: kumpulkan data, catat tanggal mulai/selesai setiap item, sepakati Definition of Done.
2. **Sprint 2**: mulai Planning Poker singkat dengan skala kecil; pecah apa pun ≥ 13.
3. **Sprint 3**: hitung velocity dan cycle time dari data; buat forecast berentang pertama dan bandingkan dengan kenyataan di akhir sprint.

Setelah itu, lakukan **retrospektif estimasi** setiap bulan: item mana yang meleset jauh, dan apa alasannya?

## Ringkasan

- Estimasi cenderung optimis; kelola dengan data historis, bukan tekad.
- Story point = ukuran relatif; velocity = kapasitas, bukan target kinerja.
- Pakai rentang dan probabilitas (persentil), bukan tanggal tunggal.
- Cycle time dan Monte Carlo sederhana memberi forecast yang jujur dengan sedikit usaha.
- Pecah item besar, siapkan Definition of Done, dan laporkan risiko sedini mungkin.

Referensi: *Actionable Agile Metrics for Predictability* (Daniel Vacanti), *Agile Estimating and Planning* (Mike Cohn), dan Scrum Guide.

<!--comments-->
raka_m: Ini yang kami butuhkan, Kev. Bagian rentang 5 sampai 7 sprint lebih jujur dan mudah dibela daripada satu tanggal.
kevin_h: Terima kasih Raka. Klien lebih tenang ketika mereka melihat risiko dikatakan di awal.
sari_dewi: Skrip Monte Carlo-nya sederhana tapi kuat. Saya jalankan dengan data tim backend dan hasilnya P85 di 5 sprint (timnya lebih cepat). Hasil yang membuka mata.
salsa_nur: Dari sisi desain, kami sering lupa memasukkan desain ke estimasi. Kita masukkan juga pekerjaan desain sebagai item yang bisa dihitung?
kevin_h: Tentu, Salsa. Item desain masuk ke papan yang sama dan DoD-nya jelas: desain disetujui dan dev-ready.
rizkymaul: Aku suka bagian 'jangan mengonversi point ke jam'. Aku biasa melakukannya karena atasan di tempat lama memintanya.
maya_kusuma: Kita punya satu kasus yang cocok untuk contoh: redesign dashboard, estimasi 8 point selesai dalam dua kali lipat waktu karena ketergantungan konten. Mau dimasukkan ke retrospektif?
kevin_h: Boleh, Maya. Kita bahas di retro bulan ini.
