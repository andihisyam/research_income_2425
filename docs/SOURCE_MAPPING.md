# Pemetaan Sumber

| Keluaran | Sumber final |
|---|---|
| Komponen rupiah | `PROJECT_LEVEL_DATA/project_components.csv` |
| Proyek | `PROJECT_LEVEL_DATA/project_level.csv` |
| Relasi personel | `PROJECT_LECTURER_LINKS/project_lecturer_links.csv` |
| QA atribusi | `MATCHING_QA/qa_metrics.json`, `QA_REPORT.md` |
| Koreksi nama | `MATCHING_QA/user_confirmed_name_overrides.csv` |

Baseline berasal dari komponen dengan `Masuk Aggregated? = Ya`. `Industry` dipetakan ke `Industri`; `Non Industry` ke `Non-Industri`. Label sumber dibersihkan dari whitespace, sedangkan label mentah tetap disimpan. DPPM tidak diberi makna sebagai pemberi dana akhir tanpa verifikasi.

Bidang THE berasal dari sumber komponen/proyek. Fakultas dan program studi berasal dari relasi personel final dan dipakai dengan fractional attribution. Personel internal yang berstatus staff/tendik sesuai koreksi pengguna tetap disertakan dalam denominator personel; jumlah final yang diaudit adalah lima orang. Aris Purwanto menggunakan `USER-ARIS-PURWANTO`, terpisah dari Setiyo Purwanto.
