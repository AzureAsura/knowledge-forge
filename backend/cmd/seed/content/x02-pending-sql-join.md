---
title: Memahami SQL JOIN dengan Contoh Tabel Scroll dan Komentar
author: hendrag
category: web-backend
difficulty: beginner
status: pending
age: 12
featured: false
cover: unsplash:1558494949-ef010cbdcc31
---

Saya masih trainee backend dan JOIN adalah topik yang paling lama membuat saya bingung. Setiap tutorial memakai diagram Venn, dan setiap kali saya melihat diagram itu, saya merasa mengerti, lalu gagal saat menulis query sendiri. Setelah Kak Sari menyuruh saya mencoba dengan data nyata dari tabel KnoFo, akhirnya jadi jelas.

Scroll ini adalah catatan saya. Kalau ada yang salah, mohon dikoreksi saat review.

![Rak server dengan kabel yang tertata](unsplash:1558494949-ef010cbdcc31)
*Data yang tersebar di banyak tabel hanya berguna setelah digabungkan dengan benar.*

## Tabel contoh

Dua tabel sederhana:

```sql
scrolls (id, title, author_id)
comments (id, scroll_id, author_id, content)
```

Data:

| scrolls.id | title |
|---|---|
| 1 | React Query |
| 2 | Index Postgres |
| 3 | Rule Tile |

| comments.id | scroll_id | content |
|---|---|---|
| 10 | 1 | Bagus sekali |
| 11 | 1 | Terima kasih |
| 12 | 2 | Mantap |

Scroll nomor 3 belum punya komentar.

## INNER JOIN: hanya yang cocok di kedua sisi

```sql
SELECT s.title, c.content
FROM scrolls s
INNER JOIN comments c ON c.scroll_id = s.id;
```

Hasil: tiga baris (React Query × 2, Index Postgres × 1). **Rule Tile tidak muncul** karena tidak punya komentar.

![Pengembang bekerja di lingkungan gelap dengan banyak layar](unsplash:1510915228340-29c85a43dcfe)
*Pengembang bekerja di lingkungan gelap dengan banyak layar.*

## LEFT JOIN: semua dari kiri, cocok dari kanan jika ada

```sql
SELECT s.title, c.content
FROM scrolls s
LEFT JOIN comments c ON c.scroll_id = s.id;
```

Hasil: empat baris. Rule Tile muncul dengan `content = NULL`. Gunakan LEFT JOIN saat kamu ingin semua scroll, dengan atau tanpa komentar.

Trik berguna: menemukan scroll **tanpa** komentar.

```sql
SELECT s.title
FROM scrolls s
LEFT JOIN comments c ON c.scroll_id = s.id
WHERE c.id IS NULL;
```

## Menghitung per scroll

```sql
SELECT s.title, COUNT(c.id) AS jumlah_komentar
FROM scrolls s
LEFT JOIN comments c ON c.scroll_id = s.id
GROUP BY s.id, s.title;
```

Perhatikan `COUNT(c.id)`, bukan `COUNT(*)`. `COUNT(*)` menghitung Rule Tile sebagai satu baris (nilai 1), sedangkan `COUNT(c.id)` mengabaikan NULL sehingga benar (0).

## Kesalahan yang saya buat

1. Menaruh filter tabel kanan di `WHERE`, yang diam-diam mengubah LEFT JOIN menjadi INNER JOIN. Taruh di `ON` bila ingin tetap menyertakan baris kiri.
2. Lupa `GROUP BY` untuk semua kolom non-agregat.
3. JOIN tanpa kondisi menghasilkan *cartesian product* (setiap baris dengan setiap baris).

Catatan: saya belum membahas RIGHT JOIN dan FULL JOIN; keduanya jarang saya pakai.

<!--comments-->
