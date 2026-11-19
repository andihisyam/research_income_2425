# Laporan QA

## Rekonsiliasi wajib

- 2024: **Rp23.931.523.665** — cocok 100%.
- 2025: **Rp22.614.422.028** — cocok 100%.
- Gabungan: **Rp46.545.945.693** — cocok 100%.
- Industri + Non-Industri = total pada kedua tahun.
- 2025 vs 2024: **−Rp1.317.101.637 (−5,50%)**.

## Keluaran revisi final

- Keseluruhan: 726 proyek, 757 komponen, 1.338 relasi proyek–personel, 494 personel unik.
- Baseline Aggregated yang dirender: 714 proyek teridentifikasi, 739 komponen, 1.279 relasi, 482 personel unik berpendanaan baseline.
- Matched: Rp44.634.462.644,67.
- Unresolved: Rp282.492.833,33.
- Proyek tanpa nama internal: Rp1.628.990.215.
- Unmatched rows: 16; ambiguous rows: 11.
- Lima personel staff/tendik-designated disertakan sesuai instruksi pengguna.
- Aris Purwanto memakai `USER-ARIS-PURWANTO`; kredit Setiyo Purwanto pada proyek Aris = 0.

## Gerbang otomatis

`scripts/validate_data.py` memeriksa baseline per tahun, total kategori, ID unik, referensi proyek–komponen, bucket atribusi, dan koreksi Aris. `npm test` memeriksa agregasi tanpa hitung ganda, atribusi fakultas, grouping sumber, dan format rupiah.

## Hasil

- `npm test`: 1 berkas, 4 pengujian lulus.
- `npm run build`: lulus (Vue type-check, Vite production build, data build, validasi).
- Catatan build: bundle JavaScript >500 kB karena ECharts; bukan kegagalan dan aplikasi tetap statis.
