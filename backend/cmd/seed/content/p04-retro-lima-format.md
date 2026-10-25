---
title: Retrospektif yang Tidak Membosankan: Lima Format dan Kapan Memakainya
author: salsa_nur
category: project-management
difficulty: beginner
status: published
age: 31
featured: false
cover: unsplash:1517048676732-d65bc937f952
---

Retrospektif pertama yang saya ikuti di Palm Studio berlangsung 90 menit. Tiga kolom ("Went well", "Didn't go well", "Action items"), sepuluh sticky note, dan satu aksi yang tidak pernah dikerjakan. Bulan berikutnya format yang sama dengan keluhan yang sama. Orang mulai menatap laptop saat sesi berlangsung.

Retro yang diulang tanpa variasi dan tanpa tindak lanjut memang cepat menjadi ritual kosong. Kak Kevin meminta saya, sebagai desainer yang suka memfasilitasi workshop, menyusun beberapa format alternatif. Scroll ini adalah hasilnya: **lima format retro**, kapan masing-masing cocok, cara memfasilitasi, dan bagaimana memastikan aksi benar-benar terjadi.

![Tim berdiskusi mengelilingi meja di ruang kerja terbuka](unsplash:1517048676732-d65bc937f952)
*Retro bukan sesi mengeluh. Ia adalah satu-satunya rapat yang tujuannya membuat rapat dan kerja berikutnya lebih baik.*

## Tujuan retro

Retro menjawab tiga pertanyaan:

1. Apa yang terjadi? (data, bukan opini)
2. Kenapa itu terjadi? (akar masalah)
3. Apa yang akan kita **ubah**? (aksi kecil dan terukur)

Kalau sesi berakhir tanpa jawaban ketiga, kamu hanya sudah curhat bersama.

## Prinsip dasar

- **Prime Directive** (Norm Kerth): *"Apa pun yang kita temukan, kita percaya semua orang telah melakukan yang terbaik yang mereka bisa, dengan pengetahuan, keterampilan, sumber daya, dan situasi yang ada."* Ini mencegah menyalahkan orang.
- **Aman secara psikologis**: boleh anonim (sticky note tanpa nama), dan fasilitator menjaga agar tidak ada yang mendominasi.
- **Waktu terbatas**: 60 menit untuk sprint dua mingguan; atur timer.
- **Fasilitator bergilir** agar bukan satu orang yang selalu memandu (dan agar bisa ikut berpartisipasi).
- **Tindak lanjut** di awal retro berikutnya: apakah aksi sebelumnya selesai?

![Tim berdiskusi di ruang kerja](unsplash:1522071820081-009f0129c71c)
*Tim berdiskusi di ruang kerja.*

## Format 1: Start / Stop / Continue

**Cocok untuk:** tim baru berretro, sesi cepat (45 menit).

| Kolom | Pertanyaan |
|---|---|
| **Start** | Apa yang sebaiknya mulai kita lakukan? |
| **Stop** | Apa yang sebaiknya kita hentikan? |
| **Continue** | Apa yang sudah bagus dan perlu dipertahankan? |

Alur: 5 menit menulis sendiri, 10 menit mengelompokkan, 10 menit voting (3 titik per orang), 15 menit membahas 2–3 teratas, 5 menit menetapkan aksi. Sederhana, dan hasilnya langsung dapat ditindaklanjuti.

## Format 2: 4Ls (Liked, Learned, Lacked, Longed for)

**Cocok untuk:** akhir proyek atau rilis besar, ketika ingin refleksi lebih luas.

- **Liked**: apa yang kita sukai?
- **Learned**: apa yang kita pelajari?
- **Lacked**: apa yang kurang?
- **Longed for**: apa yang kita harapkan ada?

Dua kolom terakhir sering mengungkap kebutuhan (alat, pelatihan, kejelasan peran) yang tidak muncul di format "went well/badly".

## Format 3: Sailboat (Perahu Layar)

**Cocok untuk:** tim yang butuh metafora visual dan percakapan lebih santai; sesi yang terasa berat.

Gambar perahu di atas laut:

| Elemen | Arti |
|---|---|
| ⛵ **Layar / angin** | Apa yang mendorong kita maju? |
| ⚓ **Jangkar** | Apa yang menahan kita? |
| 🪨 **Batu karang** | Risiko di depan |
| 🏝️ **Pulau** | Tujuan kita |

Tim menempelkan sticky note di tiap area. Fokus ke **jangkar** (hambatan saat ini) dan **batu karang** (risiko mendatang) untuk menentukan aksi. Visual yang jelas membuat orang yang pendiam lebih mudah ikut serta.

## Format 4: Timeline

**Cocok untuk:** setelah periode panjang atau kejadian penting (rilis bermasalah, perubahan tim), saat orang punya ingatan berbeda.

1. Gambar garis waktu periode tersebut.
2. Setiap orang menempelkan kejadian penting (rilis, insiden, keputusan).
3. Tambahkan **emosi** di atas/bawah garis: kapan semangat tinggi, kapan frustrasi.
4. Cari pola: kapan dan kenapa titik rendah terjadi?
5. Tentukan aksi untuk menghindari titik rendah yang berulang.

Timeline menyatukan fakta lebih dulu, sehingga diskusi tidak berubah jadi perdebatan versi cerita.

## Format 5: Five Whys + Fishbone (untuk masalah spesifik)

**Cocok untuk:** satu masalah berulang (bug yang sama muncul tiga kali, deadline terus meleset).

Mulai dari pernyataan masalah: "Rilis terlambat tiga hari." Tanyakan *kenapa* berturut-turut:

1. Kenapa terlambat? → Tes regresi menemukan bug besar di akhir.
2. Kenapa ditemukan terlambat? → Tes baru dijalankan dua hari sebelum rilis.
3. Kenapa baru dijalankan saat itu? → Lingkungan staging tidak tersedia sebelumnya.
4. Kenapa tidak tersedia? → Hanya satu staging bersama beberapa tim.
5. Kenapa hanya satu? → Tidak ada yang memiliki tugas menyediakannya.

Akar masalah: **kepemilikan lingkungan staging**, bukan "QA lambat". Aksi: tetapkan pemilik dan buat staging per-branch.

Peringatan: Five Whys bisa menyalahkan individu jika dipakai sembarangan. Cari **sebab sistemik**, bukan "si X lupa".

## Memilih format

| Situasi | Format |
|---|---|
| Tim baru, waktu singkat | Start/Stop/Continue |
| Akhir proyek | 4Ls |
| Suasana berat, perlu mencairkan | Sailboat |
| Periode panjang, versi cerita berbeda | Timeline |
| Satu masalah berulang | Five Whys |

Putar formatnya setiap sprint atau dua; **variasi menjaga energi**, dan tema berbeda memunculkan wawasan berbeda.

## Fasilitasi: beberapa teknik yang membantu

- **Silent brainstorming**: menulis sendiri 5 menit sebelum berbagi, supaya suara keras tidak mendominasi.
- **Dot voting**: 3 titik per orang untuk memilih topik, sehingga diskusi fokus pada hal yang penting bagi tim.
- **Timebox per topik**: 7 menit; jika perlu lebih, pungut dengan voting jempol (roman vote).
- **Parkir topik di luar lingkup** (misal keputusan manajemen) di "parking lot" dan tetapkan siapa yang membawanya.
- **Retro jarak jauh**: gunakan papan kolaboratif (Miro, FigJam) dan fitur anonim; kamera hidup jika memungkinkan.

## Aksi yang benar-benar terjadi

Sebagian besar retro gagal di sini. Aturan kami:

1. **Maksimal 2–3 aksi** per retro. Lebih dari itu tidak akan selesai.
2. Setiap aksi harus **SMART kecil**: apa, siapa pemiliknya (satu orang), kapan selesai.
3. Masukkan aksi ke **backlog sprint** sebagai tiket biasa, bukan catatan terpisah.
4. Awali retro berikutnya dengan **meninjau aksi sebelumnya**: selesai, tertunda, atau dibatalkan (dengan alasan).
5. Ukur dampaknya: apakah masalah itu berkurang?

Contoh aksi baik: "Dewi menambah skrip untuk membuat staging per-branch sebelum 14 Maret." Contoh aksi buruk: "Komunikasi harus lebih baik."

## Hal-hal yang harus dihindari

| Kesalahan | Dampak |
|---|---|
| Manajer mendominasi atau menilai | Orang berhenti jujur |
| Menyalahkan individu | Rasa aman hilang |
| Terlalu banyak aksi | Tak ada yang selesai |
| Tidak pernah meninjau aksi lama | Retro dianggap sia-sia |
| Format sama berulang | Bosan |
| Retro hanya membahas hal buruk | Moral turun; rayakan keberhasilan juga |

## Template singkat untuk 60 menit

| Menit | Kegiatan |
|---|---|
| 0–5 | Pembukaan, ulas aksi sebelumnya |
| 5–15 | Mengumpulkan data (format pilihan) |
| 15–25 | Mengelompokkan dan voting |
| 25–45 | Diskusi topik teratas, cari akar |
| 45–55 | Tetapkan 2–3 aksi dengan pemilik dan tenggat |
| 55–60 | Penutup: apresiasi satu sama lain |

## Penutup

Retro yang baik terasa seperti tim yang merawat dirinya sendiri. Jangan takut mengubah format, memotong sesi yang tidak produktif, atau berhenti sejenak untuk bertanya apakah retro itu sendiri masih berguna. Itu pun bisa menjadi topik retro.

Referensi: *Agile Retrospectives: Making Good Teams Great* (Esther Derby & Diana Larsen), *Retromat* (retromat.org), dan Scrum Guide.

<!--comments-->
kevin_h: Terima kasih Salsa, ini yang tim butuhkan. Kita coba Sailboat untuk retro minggu ini; saya akan siapkan papan di FigJam.
salsa_nur: Siap Pak Kevin. Saya bisa membantu memfasilitasi kalau mau.
raka_m: Aturan maksimal 3 aksi itu penting. Retro kita sebelumnya menghasilkan tujuh aksi dan tidak ada yang selesai.
sari_dewi: Five Whys memang efektif, tapi saya setuju catatan peringatannya. Kita perlu menjaga agar tidak berakhir dengan 'si X salah'.
dewilestari: Format Timeline terdengar seru. Boleh dicoba setelah rilis besar nanti?
maya_kusuma: Setuju. Setelah rilis dashboard kita pakai Timeline, supaya orang desain dan dev melihat kejadian yang sama.
putriayu: Saya suka retro Sailboat karena bisa menggambar. Saya bantu bikin template visualnya.
