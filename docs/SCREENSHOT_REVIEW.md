# Review Screenshot dan Browser

Tanggal pemeriksaan: 19 November 2026.

## Desktop (`docs/screenshots/dashboard_desktop.png`)

- KPI default 2025 tampil: Rp22,61 miliar; industri Rp2,38 miliar; non-industri Rp20,24 miliar; 358 proyek teridentifikasi.
- Perubahan 2025 terhadap 2024 tampil sebagai catatan kecil di bawah Total Pendapatan, bukan KPI tersendiri.
- Tombol `Telusuri Proyek`, filter dropdown, sticky chips, grafik tahunan, ranking sumber/distribusi, dan Top 10 proyek tampil tanpa overlap.
- Tabel proyek dan tabel personel tidak lagi tampil permanen pada halaman utama.

## Mobile (`docs/screenshots/dashboard_mobile.png`)

- Navigasi, tombol `Telusuri Proyek`, filter 2 kolom, sticky chips, dan KPI 2×2 tersusun responsif pada viewport 390×844.
- Tidak ditemukan overflow horizontal pada area utama; drawer proyek memakai lebar viewport yang aman.

## Uji browser fungsional

- Klik segmen Non-Industri 2025 membuka drawer `Non-Industri · 2025` dengan 341 proyek.
- Klik bar sumber memilih filter dan menampilkan chip lokal/global; klik bar yang sama menghapus pilihan.
- Handler klik area kosong dipasang melalui ZRender dengan `off` sebelum `on`; penghapusan filter chart tidak menghapus filter tahun.
- Filter distribusi memakai semantik toggle yang sama untuk fakultas, program studi, dan bidang THE.
- Sticky chips berada 72 px di bawah header desktop (64 px pada mobile), dapat dihapus satu per satu, dan menyediakan `Hapus semua`.
- Klik bar proyek Top 10 membuka drawer rincian proyek.
- `Telusuri Proyek` membuka drawer berisi pencarian, pengurutan, pagination, ekspor CSV, dan tautan rincian proyek.
- Drawer rincian hanya menampilkan nama personel serta fakultas/program studi; tidak menampilkan nilai atribusi, status pencocokan, atau UniID.
- Tombol kembali dari rincian proyek mengembalikan pengguna ke daftar proyek.
- Build produksi dan seluruh test lulus; konsol browser tidak menunjukkan error aplikasi.
