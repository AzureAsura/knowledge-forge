---
title: SOP Handover Proyek ke Klien: Checklist 12 Langkah agar Tidak Ada yang Tertinggal
author: kevin_h
category: project-management
difficulty: beginner
status: published
age: 88
featured: false
cover: unsplash:1600880292203-757bb62b4baf
---

Rilis berhasil, klien tersenyum, tim merayakan. Dua minggu kemudian, klien mengirim pesan jam 11 malam: "Websitenya mati." Ternyata sertifikat SSL kedaluwarsa, domain terdaftar atas nama freelancer yang sudah tidak ada, dan tidak ada yang tahu di mana kredensial server disimpan. Itu bukan bug; itu **handover yang gagal**.

Handover adalah transisi tanggung jawab dari tim kami ke klien (atau tim operasional mereka). Di Palm Studio, kami menyusun SOP 12 langkah setelah beberapa insiden seperti di atas. Scroll ini membagikan checklist itu beserta alasan di balik tiap langkah, sehingga kamu bisa menyesuaikannya dengan proyekmu.

![Dua orang berjabat tangan dengan gembira di meja kerja](unsplash:1600880292203-757bb62b4baf)
*Proyek belum selesai saat kode dirilis. Ia selesai ketika klien bisa mengoperasikannya tanpa kita.*

## Prinsip

1. **Handover dimulai di awal proyek**, bukan di minggu terakhir. Kumpulkan dokumen sepanjang jalan.
2. **Kepemilikan harus berpindah secara eksplisit**: akun, domain, kode, dan kredensial atas nama klien, bukan nama individu tim kami.
3. **Tulis untuk orang yang tidak ada di rapat**: asumsikan pembaca dokumen adalah orang baru enam bulan dari sekarang.
4. **Bukti tertulis**: persetujuan dan penerimaan harus terdokumentasi.

## Checklist 12 langkah

### Fase A: Persiapan (1–2 minggu sebelum rilis)

**1. Inventaris aset dan akses**

Daftar semua yang membentuk produk dan siapa pemiliknya:

| Aset | Contoh | Pemilik seharusnya |
|---|---|---|
| Domain & DNS | palmclient.co.id, registrar | **Klien** (kami hanya delegasi) |
| Hosting/cloud | VPS, Cloud Run, bucket, database | Akun **klien**, kami sebagai kolaborator |
| Repositori kode | GitHub/GitLab org | Org **klien** atau transfer repo |
| Layanan pihak ketiga | Payment gateway, email, analytics, peta | Akun klien |
| Sertifikat SSL | Let's Encrypt, jadwal pembaruan | Otomatis + notifikasi |
| Kredensial & secret | API key, `.env` | Password manager milik klien |
| Aset desain | Figma, font berlisensi, ikon | Klien (lisensi atas namanya) |

Temuan sering: layanan dibuat memakai email pribadi anggota tim. Pindahkan sebelum handover.

**2. Dokumentasi teknis**

Minimal berisi:

- README: apa produk ini, cara menjalankan lokal, versi tool.
- Arsitektur (diagram sederhana): komponen, alur data, dependensi eksternal.
- Daftar environment dan variabel konfigurasi (tanpa nilai rahasia).
- Cara deploy dan rollback langkah demi langkah.
- Skema database dan prosedur backup/restore.
- Keputusan penting dan alasannya (ADR singkat).

**3. Dokumentasi operasional (runbook)**

Untuk setiap kejadian umum: "situs lambat", "email tidak terkirim", "sertifikat kedaluwarsa", "disk penuh": gejala, cara diagnosis, cara memperbaiki, siapa dihubungi. Runbook ditulis sehingga orang non-pengembang pun dapat mengikuti langkah dasarnya.

### Fase B: Verifikasi (1 minggu sebelum rilis)

**4. Audit kualitas akhir**

- Semua kriteria penerimaan terpenuhi dan ditandatangani.
- Tes otomatis lulus; tidak ada bug kritis terbuka.
- Pemindaian keamanan dasar (dependensi rentan, header, HTTPS).
- Uji performa dan aksesibilitas pada halaman utama.
- Daftar **masalah yang diketahui** (known issues) dengan tingkat keparahan, supaya klien tidak terkejut.

**5. Uji pemulihan**

Backup yang tidak pernah diuji bukan backup. Lakukan **restore ke lingkungan terpisah** dan catat waktunya. Uji juga rollback rilis terakhir.

**6. Pelatihan pengguna dan admin**

Sesi langsung (atau rekaman) untuk dua kelompok: **pengguna akhir** (cara memakai fitur) dan **admin/operator** (membuat user, mengelola konten, membaca log). Sediakan panduan satu halaman dan video pendek 3–5 menit untuk tugas rutin.

### Fase C: Serah terima (hari rilis)

**7. Serah terima akses**

Pindahkan kepemilikan sesuai inventaris, **cabut akses pribadi** anggota tim yang tidak diperlukan lagi, dan putar ulang (rotate) semua secret yang pernah dibagikan lewat chat atau email. Catat siapa memegang akses admin di sisi klien (minimal dua orang agar tidak bergantung pada satu individu).

**8. Pemantauan dan peringatan**

Pastikan ada monitoring dasar *sebelum* kita pergi: uptime check, peringatan sertifikat dan domain, penggunaan disk/memori, dan error rate. Tujuan alert: ke email/Slack klien, bukan hanya ke tim kami.

**9. Berita acara serah terima (BAST)**

Dokumen formal yang berisi: lingkup yang diserahkan, daftar dokumen dan akses yang diserahkan, known issues, tanggal, dan tanda tangan kedua pihak. Ini melindungi kedua sisi: klien tahu apa yang mereka terima; kami punya bukti penyelesaian.

### Fase D: Dukungan pasca-rilis

**10. Masa garansi dan dukungan**

Definisikan **tertulis**: berapa lama (misal 30 hari), apa yang dicakup (bug dari kode kami, bukan fitur baru), waktu respons (misal 1 hari kerja untuk kritis), dan saluran kontak. Tanpa batas yang jelas, "masa garansi" berubah menjadi dukungan tanpa akhir.

**11. Pertemuan tinjauan 2 minggu setelah rilis**

Cek: apa yang berjalan baik, apa yang membingungkan pengguna, metrik awal, dan permintaan perubahan. Banyak masalah praktis baru terlihat setelah pemakaian nyata.

**12. Retrospektif internal dan arsip**

Tim kami menulis catatan pelajaran, memperbarui template SOP, dan mengarsipkan seluruh artefak proyek di lokasi terstruktur (dokumen, keputusan, kontrak, BAST). Aset kerja sementara (akun uji, lingkungan sementara) dibersihkan agar tidak menimbulkan biaya atau risiko.

![Tim berdiskusi di ruang kerja](unsplash:1522071820081-009f0129c71c)
*Tim berdiskusi di ruang kerja.*

## Template ringkas (salin dan sesuaikan)

```
HANDOVER — [Nama proyek] — [Tanggal]

1. Aset & akses            [ ] inventaris selesai   [ ] kepemilikan dipindah
2. Dokumentasi teknis      [ ] README [ ] arsitektur [ ] deploy/rollback
3. Runbook                 [ ] 5 insiden umum
4. Audit akhir             [ ] kriteria [ ] keamanan [ ] known issues
5. Uji pemulihan           [ ] restore OK ( __ menit ) [ ] rollback OK
6. Pelatihan               [ ] user [ ] admin [ ] panduan/video
7. Serah terima akses      [ ] secret diputar [ ] akses pribadi dicabut
8. Monitoring              [ ] uptime [ ] SSL/domain [ ] alert ke klien
9. BAST                    [ ] ditandatangani
10. Garansi                [ ] periode & cakupan tertulis
11. Review 2 minggu        [ ] dijadwalkan
12. Retro & arsip          [ ] selesai
```

## Kesalahan umum

| Kesalahan | Akibat | Pencegahan |
|---|---|---|
| Domain/akun atas nama freelancer | Klien terkunci | Inventaris + pindahkan lebih awal |
| Kredensial dikirim lewat chat | Kebocoran | Password manager klien, putar ulang |
| Tidak ada runbook | Klien menelepon kami tiap insiden | Tulis 5 insiden paling mungkin |
| Backup tidak pernah diuji | Gagal saat dibutuhkan | Restore drill sebelum rilis |
| Garansi tidak terdefinisi | Dukungan tak terbatas | Batas waktu dan cakupan tertulis |
| BAST tidak ada | Sengketa soal "selesai" | Tanda tangan formal |

## Ringkasan

Handover yang baik membosankan, dan itulah tujuannya: tidak ada kejutan. Dengan inventaris, dokumentasi, uji pemulihan, dan serah terima formal, proyek berakhir dengan klien yang percaya diri dan tim yang tidak dihubungi jam 11 malam.

Referensi: panduan *Operational Readiness Review* dari Google SRE Workbook (adaptasi), PMBOK Guide (*Close Project*), dan template ADR oleh Michael Nygard.

<!--comments-->
sari_dewi: Langkah 5 (uji pemulihan) sering terlewat. Saya tambahkan dari sisi backend: catat RPO/RTO yang disepakati dengan klien, supaya ekspektasi tertulis.
kevin_h: Setuju Sari. RPO dan RTO akan saya masukkan ke template BAST.
raka_m: Untuk frontend, kita bisa menambahkan daftar versi library dan tanggal dukungannya. Klien yang tidak mengupdate dependensi akan menemui masalah dalam setahun.
maya_kusuma: Dari desain: lisensi font dan ilustrasi harus masuk inventaris aset. Kita pernah hampir kena masalah lisensi.
salsa_nur: Template satu halaman di akhir sangat praktis. Boleh saya taruh versinya di Notion tim?
kevin_h: Silakan Salsa, jadikan template resmi proyek baru.
komang_adi: Saya baru ikut handover pertama minggu lalu dan checklist ini membuat saya tidak panik. Terima kasih Pak Kevin.
