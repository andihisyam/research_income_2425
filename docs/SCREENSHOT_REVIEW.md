# Review Screenshot dan Browser

Tanggal pemeriksaan: 19 November 2026.

## Desktop (`dashboard_desktop.png`)

- KPI default 2025 terbaca: Rp22,61 miliar; industri Rp2,38 miliar; non-industri Rp20,24 miliar; YoY −5,50%.
- Filter, chips, tombol reset, dan grafik utama terlihat tanpa overlap.
- Label total 2024/2025 dan legenda terbaca.

## Mobile (`dashboard_mobile.png`)

- Navigasi, filter 2 kolom, KPI 2×2, grafik, dan ranking turun menjadi satu kolom.
- Tidak ditemukan teks terpotong pada area utama; tabel sengaja dapat digulir horizontal.

## Metadata (`metadata.png`)

- Definisi dan baseline tampil berdampingan pada desktop.
- Angka baseline dan cakupan terbaca tanpa clipping.

## Uji browser fungsional

- Rute Dasbor dan Metadata: lulus.
- Default tahun 2025 dan KPI baseline: lulus.
- Filter/pencarian/reset: lulus.
- Klik baris membuka drawer dengan seluruh personel dan komponen: lulus.
- Grafik ECharts ter-render dan event klik menghasilkan chip filter: lulus.
- Tombol ekspor CSV tersedia dan payload dibentuk dari proyek terfilter pada level proyek.
- Konsol browser: tidak ada error.
