# Kamus Data

## Level komponen (`components`)

| Field | Tipe | Makna / sumber |
|---|---|---|
| componentId | string | `component_id`, ID unik komponen |
| projectId | string | relasi ke proyek |
| year | integer | `Tahun` |
| category | string | `Kategori Agregat`: Industri / Non-Industri |
| value | integer | `Jumlah Dana (IDR)`, hanya `Masuk Aggregated? = Ya` |
| sourceRaw | string | `Lembaga Pemberi Dana` apa adanya setelah trim spasi |
| sourceStandard | string | normalisasi whitespace; tidak menyimpulkan funder akhir |
| program | string | `Skema Pendanaan` |
| manager | string | `Unit Pengelola` |
| subject | string | `THE Subject Area` dari komponen proyek |

## Level proyek (`projects`)

`projectId`, tahun, judul, unit, sumber, program, nilai total komponen baseline, jumlah komponen, kategori, personel, fakultas, dan prodi. Nilai proyek tidak dijumlah ulang per personel.

## Level relasi proyek–personel (`people`)

Nama tampilan, fakultas, prodi, tipe personel, status pencocokan, dan `fractionalValue`. ID personel dipakai internal untuk agregasi tetapi tidak ditampilkan atau diekspor.

## Tiga nilai yang tidak boleh dicampur

1. **Total institusi:** komponen baseline dihitung sekali.
2. **Nilai proyek terkait:** nilai utuh proyek untuk konteks keterlibatan; dapat berulang antar-personel.
3. **Atribusi proporsional:** bagian proyek menurut personel internal; bukan pembayaran nyata.
