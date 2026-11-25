<script setup lang="ts">
import { onMounted, ref } from "vue";
import { rpFull } from "../lib/data";

interface AnnualBaseline {
  year: number;
  industry: number;
  nonIndustry: number;
  total: number;
}

interface Metadata {
  refreshDate: string;
  sources: string[];
  baseline: AnnualBaseline[];
  coverage: {
    matchedFraction: number;
    unallocatedFraction: number;
    withoutInternalNames: number;
  };
  limitations: string[];
}

const meta = ref<Metadata | null>(null);
onMounted(
  async () =>
    (meta.value = await fetch("./data/metadata.json").then((r) => r.json())),
);
</script>
<template>
  <div class="metadata" v-if="meta">
    <section class="hero">
      <div>
        <span class="eyebrow">METADATA & DEFINISI</span>
        <h1>Landasan angka pada dasbor</h1>
        <p>Definisi, sumber, cakupan, batasan, dan jejak pembaruan snapshot.</p>
      </div>
    </section>
    <div class="meta-grid">
      <article class="card">
        <h2>Definisi indikator</h2>
        <dl class="definitions">
          <div>
            <dt>Total Pendapatan Penelitian</dt>
            <dd>
              Jumlah komponen yang bertanda masuk Aggregated. Setiap komponen
              dihitung satu kali.
            </dd>
          </div>
          <div>
            <dt>Industri / Non-Industri</dt>
            <dd>
              Kategori agregat yang dibawa dari tracker dan komponen sumber,
              bukan klasifikasi baru dari nama pemberi dana.
            </dd>
          </div>
          <div>
            <dt>Nilai Proyek Terkait</dt>
            <dd>
              Nilai utuh proyek yang melibatkan personel. Penjumlahan lintas
              personel dapat melebihi total institusi.
            </dd>
          </div>
          <div>
            <dt>Atribusi Unit</dt>
            <dd>
              Proyek dibagi proporsional menurut personel internal; pendapatan
              laboratorium dipetakan langsung melalui program studi pemilik. Ini
              bukan pembayaran atau pendapatan pribadi.
            </dd>
          </div>
          <div>
            <dt>Proyek teridentifikasi</dt>
            <dd>
              Kelompok konservatif berdasarkan tahun, unit, judul
              ternormalisasi, sheet, dan baris sumber. Bukan klaim deduplikasi
              universal.
            </dd>
          </div>
        </dl>
      </article>
      <article class="card">
        <h2>Rekonsiliasi pendapatan</h2>
        <table>
          <thead>
            <tr>
              <th>Tahun</th>
              <th>Industri</th>
              <th>Non-Industri</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="x in meta.baseline" :key="x.year">
              <td>{{ x.year }}</td>
              <td>{{ rpFull(x.industry) }}</td>
              <td>{{ rpFull(x.nonIndustry) }}</td>
              <td>
                <b>{{ rpFull(x.total) }}</b>
              </td>
            </tr>
          </tbody>
        </table>
        <p class="notice">
          Gabungan 2024–2025:
          <b>{{
            rpFull(meta.baseline.reduce((total, year) => total + year.total, 0))
          }}</b
          >.
        </p>
      </article>
      <article class="card">
        <h2>Sumber data</h2>
        <ul>
          <li v-for="x in meta.sources" :key="x">{{ x }}</li>
        </ul>
        <p>
          Komponen pendapatan menjadi sumber KPI rupiah; proyek menjadi unit
          penelusuran; relasi personel dan kepemilikan laboratorium menjadi
          dasar distribusi unit.
        </p>
        <p>
          <b>Tanggal refresh:</b>
          {{ new Date(meta.refreshDate).toLocaleString("id-ID") }}
        </p>
      </article>
      <article class="card">
        <h2>Cakupan pencocokan</h2>
        <dl class="definitions">
          <div>
            <dt>Terhubung ke personel</dt>
            <dd>{{ rpFull(meta.coverage.matchedFraction) }}</dd>
          </div>
          <div>
            <dt>Nama belum teralokasi</dt>
            <dd>{{ rpFull(meta.coverage.unallocatedFraction) }}</dd>
          </div>
          <div>
            <dt>Tanpa nama internal</dt>
            <dd>{{ rpFull(meta.coverage.withoutInternalNames) }}</dd>
          </div>
        </dl>
        <p>
          Pendapatan tanpa nama internal berasal dari laboratorium dan tetap
          didistribusikan melalui program studi/unit pemilik.
        </p>
      </article>
      <article class="card wide">
        <h2>Kamus field ringkas</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Field</th>
                <th>Level</th>
                <th>Arti</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>componentId</td>
                <td>Komponen</td>
                <td>ID stabil komponen pendapatan</td>
              </tr>
              <tr>
                <td>projectId</td>
                <td>Proyek</td>
                <td>ID kelompok proyek konservatif</td>
              </tr>
              <tr>
                <td>value</td>
                <td>Komponen / proyek</td>
                <td>Nominal rupiah integer</td>
              </tr>
              <tr>
                <td>sourceRaw / sourceStandard</td>
                <td>Komponen</td>
                <td>
                  Label mentah dan label yang dibersihkan tanpa menyimpulkan
                  funder akhir
                </td>
              </tr>
              <tr>
                <td>subject</td>
                <td>Komponen proyek</td>
                <td>THE Subject Area dari sumber</td>
              </tr>
              <tr>
                <td>faculty / prodi</td>
                <td>Relasi / unit</td>
                <td>
                  Unit personel hasil pencocokan atau unit pemilik laboratorium
                </td>
              </tr>
              <tr>
                <td>fractionalValue</td>
                <td>Relasi</td>
                <td>Atribusi proporsional, bukan pembayaran</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
      <article class="card wide">
        <h2>Keterbatasan</h2>
        <ul>
          <li v-for="x in meta.limitations" :key="x">{{ x }}</li>
          <li>
            Nilai proyek pada rincian dapat terdiri atas lebih dari satu
            komponen kategori.
          </li>
          <li>
            Identitas sensitif seperti NIDN dan ID internal tidak ditampilkan
            atau diekspor.
          </li>
          <li>
            Aris Purwanto dipertahankan sebagai personel terpisah dengan
            identitas sintetis USER-ARIS-PURWANTO dan tidak dipetakan ke Setiyo
            Purwanto.
          </li>
        </ul>
      </article>
    </div>
  </div>
</template>
