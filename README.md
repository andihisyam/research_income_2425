# Dasbor Monitoring Pendapatan Penelitian UMS

Aplikasi statis Vue 3 untuk memantau baseline pendapatan penelitian UMS 2024–2025. Antarmuka hanya memiliki dua rute: **Dasbor** dan **Metadata**.

## Menjalankan

```bash
npm install
npm run data:build
npm run data:validate
npm run dev
```

Build produksi:

```bash
npm test
npm run build
npm run preview
```

## Memperbarui data

`scripts/build_data.py` selalu membaca keluaran terbaru pada `../PHASE3_FRACTIONAL_ATTRIBUTION_REVISION/` dan menulis ulang `public/data/dashboard.json` serta `metadata.json`. File Excel sumber tidak diubah. Jalankan kembali build bila file revisi berubah.

Snapshot final sumber berisi 726 proyek, 757 komponen, dan 1.338 relasi proyek–personel secara keseluruhan. Dasbor rupiah hanya memuat baris yang masuk baseline Aggregated: 714 proyek teridentifikasi, 739 komponen baseline, dan 1.279 relasi pada proyek baseline. Istilah **proyek teridentifikasi** dipakai karena deduplikasi lintas seluruh sumber belum dibuktikan independen.

## Semantik penting

- KPI institusi menjumlah komponen baseline satu kali.
- Saat fakultas/prodi aktif, KPI berlabel atribusi proporsional dan bukan total institusi.
- Nilai proyek terkait bukan pendapatan pribadi.
- DPPM ditampilkan sebagai label sumber tercatat; dashboard tidak menyimpulkan DPPM sebagai pemberi dana akhir.
- CSV diekspor pada level proyek dan tidak memuat NIDN atau ID internal.
- Snapshot bersifat statis, bukan waktu nyata.

Lihat `docs/` untuk kamus data, pemetaan sumber, QA, dan review screenshot.
