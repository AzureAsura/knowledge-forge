---
title: Index Postgres Pertamamu: Dari Seq Scan ke Index Scan dengan EXPLAIN ANALYZE
author: sari_dewi
category: web-backend
difficulty: intermediate
status: published
age: 19
featured: false
cover: unsplash:1544197150-b99a580bb7a8
---

"Query-nya lambat, tambah index saja." Kalimat itu benar sekitar separuh waktu. Separuh lainnya, index baru tidak dipakai sama sekali, atau malah memperlambat penulisan. Cara membedakan keduanya bukan intuisi, tapi **EXPLAIN ANALYZE**.

Di scroll ini kita bangun intuisi itu langkah demi langkah: apa itu sequential scan, kapan index membantu, bagaimana urutan kolom di composite index menentukan nasib query, dan bagaimana membaca output EXPLAIN tanpa panik. Contohnya memakai tabel `scrolls` dan `comments` seperti di KnoFo.

![Rak server dengan kabel jaringan](unsplash:1544197150-b99a580bb7a8)
*Database yang membaca semua baris untuk menjawab satu pertanyaan sama seperti perpustakaan tanpa katalog.*

## Siapkan data latihan

Index baru terasa manfaatnya di tabel besar, jadi kita buat satu juta komentar palsu:

```sql
CREATE TABLE comments (
  id         bigserial PRIMARY KEY,
  scroll_id  bigint      NOT NULL,
  author_id  bigint      NOT NULL,
  content    text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO comments (scroll_id, author_id, content, created_at)
SELECT (random() * 5000)::int + 1,
       (random() * 200)::int + 1,
       'komentar ' || g,
       now() - (random() * interval '180 days')
FROM generate_series(1, 1000000) g;

ANALYZE comments;
```

`ANALYZE` memperbarui statistik yang dipakai query planner. Tanpanya, perkiraan planner bisa meleset jauh.

## Query yang lambat

Halaman detail scroll menampilkan komentar terbaru untuk satu scroll:

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM comments
WHERE scroll_id = 1234
ORDER BY created_at DESC
LIMIT 20;
```

Output (disingkat):

```
Limit  (cost=21840.5..21840.6 rows=20) (actual time=96.4..96.4 rows=20 loops=1)
  ->  Sort  (cost=21840.5..21841.0 rows=200) (actual time=96.4..96.4 rows=20)
        Sort Key: created_at DESC
        Sort Method: top-N heapsort  Memory: 28kB
        ->  Seq Scan on comments  (cost=0.00..21835.0 rows=200)
              Filter: (scroll_id = 1234)
              Rows Removed by Filter: 999800
Planning Time: 0.1 ms
Execution Time: 96.5 ms
```

Cara membacanya:

- **Seq Scan**: membaca seluruh tabel baris demi baris.
- **Rows Removed by Filter: 999800**: hampir semua baris dibaca lalu dibuang. Ini tanda besar bahwa index akan membantu.
- **actual time** adalah waktu nyata (ms); **cost** adalah perkiraan unit internal planner (bukan milidetik).
- `EXPLAIN` saja hanya rencana; `EXPLAIN ANALYZE` benar-benar **menjalankan** query. Hati-hati dengan `UPDATE`/`DELETE`: bungkus dengan `BEGIN; ... ROLLBACK;`.

![Pengembang bekerja di lingkungan gelap dengan banyak layar](unsplash:1510915228340-29c85a43dcfe)
*Pengembang bekerja di lingkungan gelap dengan banyak layar.*

## Index pertama: satu kolom

```sql
CREATE INDEX idx_comments_scroll ON comments (scroll_id);
```

Ulangi EXPLAIN. Sekarang:

```
->  Sort  (actual time=0.31..0.32 rows=20)
      ->  Bitmap Heap Scan on comments  (rows=200)
            Recheck Cond: (scroll_id = 1234)
            ->  Bitmap Index Scan on idx_comments_scroll
                  Index Cond: (scroll_id = 1234)
Execution Time: 0.45 ms
```

Dari 96 ms ke 0,45 ms. Tetapi perhatikan masih ada langkah **Sort**: Postgres mengambil 200 komentar milik scroll itu lalu mengurutkannya. Untuk 200 baris tidak terasa, untuk scroll dengan 50.000 komentar, terasa.

## Composite index: urutan kolom menentukan segalanya

Index pada `(scroll_id, created_at DESC)` bisa menjawab filter **dan** urutan sekaligus:

```sql
DROP INDEX idx_comments_scroll;
CREATE INDEX idx_comments_scroll_created ON comments (scroll_id, created_at DESC);
```

```
Limit  (actual time=0.03..0.05 rows=20)
  ->  Index Scan using idx_comments_scroll_created on comments
        Index Cond: (scroll_id = 1234)
Execution Time: 0.07 ms
```

Tidak ada Sort. Postgres langsung membaca 20 entri pertama dari index yang sudah terurut, lalu berhenti. Inilah mengapa `LIMIT` bersama index terurut sangat cepat.

### Aturan urutan kolom

1. **Kolom kesamaan (`=`) dulu**, lalu kolom rentang atau urutan.
2. Index `(a, b)` bisa dipakai untuk filter `a`, atau `a` dan `b`, tapi **tidak efisien** untuk filter hanya `b`.
3. Kolom dengan kardinalitas lebih tinggi tidak otomatis harus di depan; yang menentukan adalah pola query.

Kita bisa lihat aturan nomor 2:

```sql
EXPLAIN SELECT * FROM comments WHERE created_at > now() - interval '1 day';
-- Seq Scan: index (scroll_id, created_at) tidak membantu karena scroll_id tidak difilter
```

Kalau query seperti itu sering, buat index terpisah di `created_at`.

## Partial index: index hanya untuk sebagian baris

Misalkan 95% scroll berstatus `published` dan kamu hanya sering menanyakan yang `pending`:

```sql
CREATE INDEX idx_scrolls_pending
  ON scrolls (created_at)
  WHERE status = 'pending';
```

Index ini kecil karena hanya berisi baris pending. Query harus memuat predikat yang cocok (`WHERE status = 'pending'`) agar planner memakainya.

## Index untuk pencarian teks

`LIKE '%kata%'` tidak bisa memakai B-tree biasa. Pilihannya:

- `pg_trgm` + index GIN untuk `ILIKE '%kata%'` dan pencarian mirip.
- `tsvector` + GIN untuk full-text search yang tahu bahasa.

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_scrolls_title_trgm ON scrolls USING gin (title gin_trgm_ops);
```

## Harga index

Index tidak gratis:

| Biaya | Dampak |
|---|---|
| Ruang disk | Setiap index menyimpan salinan kolomnya |
| Penulisan | Setiap `INSERT`/`UPDATE` harus memperbarui semua index |
| Vacuum | Lebih banyak yang dibersihkan |

Aturan kasar: tabel yang **banyak dibaca** boleh punya beberapa index; tabel yang **sangat sering ditulis** (log, event) pikirkan baik-baik. Temukan index yang tidak pernah dipakai dengan:

```sql
SELECT relname, indexrelname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC
LIMIT 20;
```

Index dengan `idx_scan = 0` selama berminggu-minggu adalah kandidat dihapus.

## Kenapa planner kadang mengabaikan index-mu

- **Tabel kecil.** Sequential scan memang lebih cepat daripada lompat-lompat lewat index.
- **Filter tidak selektif.** Kalau query mengembalikan 40% baris, scan penuh lebih murah.
- **Tipe tidak cocok.** `WHERE id = '123'` dengan `id` integer kadang memicu konversi.
- **Fungsi pada kolom.** `WHERE lower(email) = ...` tidak memakai index di `email`; buat index ekspresi `(lower(email))`.
- **Statistik basi.** Jalankan `ANALYZE`.

## Alur kerja yang saya pakai

1. Ambil query lambat dari log (`log_min_duration_statement = 200ms`) atau `pg_stat_statements`.
2. Jalankan `EXPLAIN (ANALYZE, BUFFERS)` dengan parameter nyata.
3. Cari: `Seq Scan` dengan `Rows Removed by Filter` besar, `Sort` mahal, perbedaan jauh antara `rows` perkiraan dan nyata.
4. Buat index kandidat, `ANALYZE`, ulangi EXPLAIN.
5. Bandingkan waktu **dan** pastikan penulisan tidak melambat secara berarti.
6. Catat alasan index di migrasi (komentar), supaya orang berikutnya tidak menghapusnya karena heran.

## Penutup

Index adalah janji bahwa urutan penyimpanan membantu pertanyaan tertentu. Kalau pertanyaanmu berubah, janjinya berubah. Biasakan membaca rencana query seperti membaca stack trace: dari baris paling dalam ke luar, cari tempat waktu dihabiskan.

Referensi: dokumentasi PostgreSQL (*Indexes*, *Using EXPLAIN*, *Multicolumn Indexes*, *Partial Indexes*) dan `pg_stat_statements`.

<!--comments-->
komang_adi: Saya jalankan latihan satu juta baris di laptop, dan lonjakan dari 96 ms ke 0,07 ms memang mengejutkan. Satu pertanyaan: untuk index composite, apakah kolom 'DESC' di index wajib sama dengan ORDER BY?
sari_dewi: Tidak wajib, Postgres bisa membaca index mundur. Tapi kalau urutan campuran (a ASC, b DESC) harus persis sama dengan indexnya.
hendrag: Apa bedanya Bitmap Index Scan dengan Index Scan biasa? Saya sering lihat keduanya.
sari_dewi: Bitmap dipakai saat baris yang cocok cukup banyak. Postgres mengumpulkan lokasi halaman lebih dulu, lalu membacanya berurutan. Index Scan biasa pas untuk sedikit baris atau saat urutan index dipakai (seperti LIMIT).
rizkymaul: Tip yang bagus tentang pg_stat_user_indexes. Di proyek lama saya, ada 9 index yang tidak pernah dipakai, semuanya memperlambat insert.
raka_m: Dari sisi frontend, saya hanya ingin bilang: halaman komentar sekarang terasa instan. Terima kasih sudah mengerjakan index ini, Sari.
