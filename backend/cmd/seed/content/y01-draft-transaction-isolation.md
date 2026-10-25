---
title: Catatan Belajar: Transaction Isolation di Postgres (Draft)
author: komang_adi
category: web-backend
difficulty: intermediate
status: draft
age: 3
featured: false
cover: unsplash:1614064641938-3bbee52942c7
---

> **Draft.** Catatan belajar yang belum selesai. Bagian race condition masih perlu contoh yang saya uji sendiri.

Kemarin Kak Sari menyebut bahwa dua request bersamaan bisa sama-sama lolos pengecekan "stok masih ada" walaupun kodenya terlihat benar. Itu membuat saya membaca tentang **transaction isolation level** di PostgreSQL.

![Gembok merah di atas keyboard](unsplash:1614064641938-3bbee52942c7)
*Transaksi bukan hanya "semua atau tidak sama sekali"; ia juga soal apa yang boleh dilihat transaksi lain.*

## Empat level (menurut standar SQL)

| Level | Dirty read | Non-repeatable read | Phantom read |
|---|---|---|---|
| Read Uncommitted | mungkin (di Postgres sama dengan Read Committed) | mungkin | mungkin |
| **Read Committed** (default Postgres) | tidak | mungkin | mungkin |
| Repeatable Read | tidak | tidak | tidak (di Postgres) |
| Serializable | tidak | tidak | tidak |

## Yang sudah saya pahami

- Default Postgres adalah **Read Committed**: setiap statement melihat data yang sudah di-commit sampai saat statement itu mulai.
- Karena itu pola "SELECT lalu UPDATE" di dua transaksi bisa tumpang tindih (lost update).
- Solusi yang saya temukan: `SELECT ... FOR UPDATE` untuk mengunci baris, atau menaikkan level ke `REPEATABLE READ`/`SERIALIZABLE` dan siap mengulang transaksi bila terjadi `serialization_failure`.

## TODO

- [ ] Coba contoh race condition dengan dua sesi `psql`
- [ ] Bandingkan `FOR UPDATE` vs `SERIALIZABLE`
- [ ] Tanya Kak Sari kapan memilih yang mana
- [ ] Tambah contoh Go dengan `db.Transaction`

<!--comments-->
