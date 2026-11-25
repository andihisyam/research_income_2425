<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { BarChart, RadarChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  RadarComponent,
  TooltipComponent,
} from "echarts/components";
import InteractiveChart from "../components/InteractiveChart.vue";
import { useDashboardStore } from "../stores/dashboard";
import {
  rpFull,
  rpShort,
  displayProdiName,
  type Component,
  type Project,
  type Person,
} from "../lib/data";
import "../faculty.css";

use([
  CanvasRenderer,
  BarChart,
  RadarChart,
  GridComponent,
  LegendComponent,
  RadarComponent,
  TooltipComponent,
]);
const route = useRoute();
const s = useDashboardStore();
const faculty = computed(() =>
  decodeURIComponent(String(route.params.code || "")),
);

function shareFor(p: Project, code: string) {
  if (!p.value) return 0;
  if (p.manager === "Laboratorium") return p.ownerFaculty === code ? 1 : 0;
  return (
    p.people
      .filter((x) => x.matched && x.faculty === code)
      .reduce((sum, x) => sum + x.fractionalValue, 0) / p.value
  );
}
const projectComponents = computed(() => {
  const map = new Map<string, Component[]>();
  for (const c of s.data?.components || []) {
    const a = map.get(c.projectId) || [];
    a.push(c);
    map.set(c.projectId, a);
  }
  return map;
});
const projects = computed(
  () => s.data?.projects.filter((p) => shareFor(p, faculty.value) > 0) || [],
);
const componentValue = computed(() => {
  let total = 0,
    industry = 0,
    nonIndustry = 0,
    laboratory = 0;
  for (const p of projects.value) {
    const share = shareFor(p, faculty.value);
    for (const c of projectComponents.value.get(p.projectId) || []) {
      const value = c.value * share;
      total += value;
      if (c.category === "Industri") industry += value;
      if (c.category === "Non-Industri") nonIndustry += value;
    }
    if (p.manager === "Laboratorium") laboratory += p.value;
  }
  return { total, industry, nonIndustry, laboratory };
});
function uniquePeople(code: string) {
  const map = new Map<string, Person>();
  for (const p of s.data?.projects || [])
    for (const x of p.people)
      if (x.matched && x.faculty === code) map.set(x.personKey, x);
  return [...map.values()];
}
const people = computed(() => uniquePeople(faculty.value));
const profile = computed(() =>
  s.data?.facultyProfiles?.find((x) => x.faculty === faculty.value),
);
const allLecturers = computed(
  () => profile.value?.allLecturers || people.value.length,
);
const participation = computed(() =>
  allLecturers.value ? people.value.length / allLecturers.value : 0,
);
const prodiRows = computed(() => {
  const map = new Map<
    string,
    {
      value: number;
      projects: Set<string>;
      people: Set<string>;
      laboratory: number;
    }
  >();
  for (const p of projects.value) {
    if (p.manager === "Laboratorium" && p.ownerProdi) {
      const r = map.get(p.ownerProdi) || {
        value: 0,
        projects: new Set(),
        people: new Set(),
        laboratory: 0,
      };
      r.value += p.value;
      r.laboratory += p.value;
      r.projects.add(p.projectId);
      map.set(p.ownerProdi, r);
      continue;
    }
    for (const x of p.people) {
      if (!x.matched || x.faculty !== faculty.value) continue;
      const r = map.get(x.prodi) || {
        value: 0,
        projects: new Set(),
        people: new Set(),
        laboratory: 0,
      };
      r.value += x.fractionalValue;
      r.projects.add(p.projectId);
      r.people.add(x.personKey);
      map.set(x.prodi, r);
    }
  }
  return [...map]
    .map(([name, r]) => ({
      name,
      value: r.value,
      projectCount: r.projects.size,
      personCount: r.people.size,
      laboratory: r.laboratory,
    }))
    .sort((a, b) => b.value - a.value);
});
const annualRows = computed(() =>
  [2024, 2025].map((year) => {
    let industry = 0,
      nonIndustry = 0;
    for (const p of projects.value.filter((x) => x.year === year)) {
      const share = shareFor(p, faculty.value);
      for (const c of projectComponents.value.get(p.projectId) || []) {
        if (c.category === "Industri") industry += c.value * share;
        if (c.category === "Non-Industri") nonIndustry += c.value * share;
      }
    }
    return { year, industry, nonIndustry, total: industry + nonIndustry };
  }),
);
const annualModalOpen = ref(false);
const annualModalYear = ref<number | null>(null);
const annualModalCategory = ref("");
const annualModalPage = ref(1);
const annualModalProjects = computed(() => {
  if (annualModalYear.value === null || !annualModalCategory.value) return [];
  return projects.value
    .map((project) => {
      const attribution = (projectComponents.value.get(project.projectId) || [])
        .filter(
          (c) =>
            c.year === annualModalYear.value &&
            c.category === annualModalCategory.value,
        )
        .reduce(
          (sum, c) => sum + c.value * shareFor(project, faculty.value),
          0,
        );
      if (!attribution) return null;
      const prodis =
        project.manager === "Laboratorium" && project.ownerProdi
          ? [project.ownerProdi]
          : project.people
              .filter((x) => x.matched && x.faculty === faculty.value)
              .map((x) => x.prodi)
              .filter(Boolean);
      return {
        project,
        attribution,
        prodi:
          [...new Set(prodis)].map(displayProdiName).join(", ") ||
          "Tidak terpetakan",
      };
    })
    .filter(
      (x): x is { project: Project; attribution: number; prodi: string } =>
        Boolean(x),
    )
    .sort((a, b) => b.attribution - a.attribution);
});
const annualModalTotal = computed(() =>
  annualModalProjects.value.reduce((sum, x) => sum + x.attribution, 0),
);
const annualModalPageCount = computed(() =>
  Math.max(1, Math.ceil(annualModalProjects.value.length / 10)),
);
const pagedAnnualModalProjects = computed(() =>
  annualModalProjects.value.slice(
    (annualModalPage.value - 1) * 10,
    annualModalPage.value * 10,
  ),
);
function openAnnualModal(event: any) {
  const year = Number(event?.name);
  const category = String(event?.seriesName || "");
  if (!Number.isFinite(year) || !category) return;
  annualModalYear.value = year;
  annualModalCategory.value = category;
  annualModalPage.value = 1;
  annualModalOpen.value = true;
}
function closeAnnualModal() {
  annualModalOpen.value = false;
}
const sourceRows = computed(() => {
  const map = new Map<string, number>();
  for (const p of projects.value) {
    const share = shareFor(p, faculty.value);
    for (const c of projectComponents.value.get(p.projectId) || [])
      map.set(
        c.sourceStandard,
        (map.get(c.sourceStandard) || 0) + c.value * share,
      );
  }
  return [...map]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
});
const labs = computed(() =>
  projects.value
    .filter((p) => p.manager === "Laboratorium")
    .sort((a, b) => b.value - a.value),
);
function rpCompact(n: number) {
  const a = Math.abs(n),
    sign = n < 0 ? "−" : "";
  if (a >= 1e9)
    return `${sign}Rp${(a / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  if (a >= 1e6)
    return `${sign}Rp${(a / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  if (a >= 1e3)
    return `${sign}Rp${(a / 1e3).toLocaleString("id-ID", { maximumFractionDigits: 1 })} rb`;
  return sign + rpFull(a);
}
function shortProdiLabel(name: string) {
  const clean = name.replace(/^Program Studi\s+/i, "").trim();
  const max = 24;
  const lines: string[] = [];
  let current = "";
  for (const word of clean.split(/\s+/)) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= max) current = next;
    else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  if (lines.length <= 2) return lines.join("\n");
  let second = lines.slice(1).join(" ");
  if (second.length > max - 1) second = second.slice(0, max - 1).trimEnd();
  return `${lines[0]}\n${second}…`;
}
const prodiChartHeight = computed(() =>
  Math.min(760, Math.max(390, prodiRows.value.slice(0, 12).length * 58 + 70)),
);

const annualOption = computed(() => ({
  tooltip: { trigger: "axis" },
  legend: { top: 0 },
  grid: { left: 62, right: 24, top: 34, bottom: 32 },
  xAxis: {
    type: "category",
    data: annualRows.value.map((x) => String(x.year)),
  },
  yAxis: {
    type: "value",
    axisLabel: { formatter: (v: number) => rpShort(v).replace("Rp", "") },
  },
  series: [
    {
      name: "Industri",
      type: "bar",
      barMaxWidth: 72,
      data: annualRows.value.map((x) => x.industry),
      itemStyle: { color: "#e09132", borderRadius: [5, 5, 0, 0] },
      label: {
        show: true,
        position: "top",
        formatter: (p: any) => rpShort(p.value),
      },
    },
    {
      name: "Non-Industri",
      type: "bar",
      barMaxWidth: 72,
      data: annualRows.value.map((x) => x.nonIndustry),
      itemStyle: { color: "#1d7a5d", borderRadius: [5, 5, 0, 0] },
      label: {
        show: true,
        position: "top",
        formatter: (p: any) => rpShort(p.value),
      },
    },
  ],
}));
const prodiOption = computed(() => {
  const d = [...prodiRows.value.slice(0, 12)].reverse();
  return {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "none" },
      confine: true,
      formatter: (params: any[]) => {
        const name = params[0]?.name || "";
        return `<b>${name}</b><br>${params.map((p) => `${p.marker}${rpFull(p.value)}`).join("<br>")}`;
      },
    },
    grid: { left: 270, right: 82, top: 22, bottom: 28 },
    xAxis: {
      type: "value",
      axisLabel: { formatter: (v: number) => rpShort(v).replace("Rp", "") },
    },
    yAxis: {
      type: "category",
      data: d.map((x) => x.name),
      axisLabel: {
        formatter: (value: string) => shortProdiLabel(value),
        width: 240,
        overflow: "break",
        lineHeight: 17,
      },
    },
    series: [
      {
        type: "bar",
        data: d.map((x) => x.value),
        barWidth: 24,
        barCategoryGap: "45%",
        itemStyle: { color: "#5b7f37", borderRadius: [0, 5, 5, 0] },
        emphasis: { focus: "self", itemStyle: { opacity: 0.78 } },
        label: {
          show: true,
          position: "right",
          rotate: 0,
          formatter: (p: any) => rpCompact(p.value),
        },
      },
    ],
    media: [
      {
        query: { maxWidth: 650 },
        option: {
          grid: { left: 150, right: 56 },
          yAxis: { axisLabel: { width: 130 } },
        },
      },
    ],
  };
});
const prodiModalOpen = ref(false);
const selectedProdiName = ref("");
const prodiProjectPage = ref(1);
const selectedProdiRow = computed(() =>
  prodiRows.value.find((x) => x.name === selectedProdiName.value),
);
const selectedProdiProjects = computed(() => {
  const name = selectedProdiName.value;
  if (!name) return [];
  return projects.value
    .map((project) => {
      if (project.manager === "Laboratorium")
        return project.ownerProdi === name
          ? { project, attribution: project.value }
          : null;
      const attribution = project.people
        .filter(
          (x) => x.matched && x.faculty === faculty.value && x.prodi === name,
        )
        .reduce((sum, x) => sum + x.fractionalValue, 0);
      return attribution > 0 ? { project, attribution } : null;
    })
    .filter((x): x is { project: Project; attribution: number } => Boolean(x))
    .sort((a, b) => b.attribution - a.attribution);
});
const prodiProjectPageCount = computed(() =>
  Math.max(1, Math.ceil(selectedProdiProjects.value.length / 10)),
);
const pagedProdiProjects = computed(() =>
  selectedProdiProjects.value.slice(
    (prodiProjectPage.value - 1) * 10,
    prodiProjectPage.value * 10,
  ),
);
function openProdiModal(event: any) {
  selectedProdiName.value = String(event?.name || "");
  prodiProjectPage.value = 1;
  prodiModalOpen.value = Boolean(selectedProdiName.value);
}
function closeProdiModal() {
  prodiModalOpen.value = false;
}
function openProdiCategory(dataIndex: number) {
  const d = [...prodiRows.value.slice(0, 12)].reverse();
  const row = d[dataIndex];
  if (row) openProdiModal({ name: row.name });
}
function onEscape(event: KeyboardEvent) {
  if (event.key === "Escape") {
    closeProdiModal();
    closeSourceModal();
    closeAnnualModal();
  }
}
watch(selectedProdiName, () => {
  prodiProjectPage.value = 1;
});
onMounted(() => {
  if (!s.data) s.load();
  window.addEventListener("keydown", onEscape);
});
onBeforeUnmount(() => window.removeEventListener("keydown", onEscape));

const sourceModalOpen = ref(false);
const selectedSourceName = ref("");
const sourceProjectPage = ref(1);
const sourceModalProjects = computed(() => {
  const name = selectedSourceName.value;
  if (!name) return [];
  return projects.value
    .map((project) => {
      const share = shareFor(project, faculty.value);
      const attribution = (projectComponents.value.get(project.projectId) || [])
        .filter((c) => c.sourceStandard === name)
        .reduce((sum, c) => sum + c.value * share, 0);
      if (!attribution) return null;
      const prodis =
        project.manager === "Laboratorium" && project.ownerProdi
          ? [project.ownerProdi]
          : project.people
              .filter((x) => x.matched && x.faculty === faculty.value)
              .map((x) => x.prodi)
              .filter(Boolean);
      return {
        project,
        attribution,
        prodi:
          [...new Set(prodis)].map(displayProdiName).join(", ") ||
          "Tidak terpetakan",
      };
    })
    .filter(
      (x): x is { project: Project; attribution: number; prodi: string } =>
        Boolean(x),
    )
    .sort((a, b) => b.attribution - a.attribution);
});
const sourceModalTotal = computed(() =>
  sourceModalProjects.value.reduce((sum, x) => sum + x.attribution, 0),
);
const sourceProjectPageCount = computed(() =>
  Math.max(1, Math.ceil(sourceModalProjects.value.length / 10)),
);
const pagedSourceModalProjects = computed(() =>
  sourceModalProjects.value.slice(
    (sourceProjectPage.value - 1) * 10,
    sourceProjectPage.value * 10,
  ),
);
const sourceChartRows = computed(() =>
  [...sourceRows.value.slice(0, 10)].reverse(),
);
function openSourceModal(payload: any) {
  const name =
    typeof payload === "number"
      ? sourceChartRows.value[payload]?.name
      : payload?.name || payload?.data?.name;
  selectedSourceName.value = String(name || "");
  sourceProjectPage.value = 1;
  sourceModalOpen.value = Boolean(name);
}
function closeSourceModal() {
  sourceModalOpen.value = false;
}

const sourceOption = computed(() => {
  const d = sourceRows.value.slice(0, 10).reverse();
  return {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "none" },
      confine: true,
      formatter: (p: any[]) => `${p[0].name}<br>${rpFull(p[0].value)}`,
    },
    grid: { left: 165, right: 24, top: 8, bottom: 28 },
    xAxis: {
      type: "value",
      axisLabel: { formatter: (v: number) => rpShort(v).replace("Rp", "") },
    },
    yAxis: {
      type: "category",
      data: d.map((x) => x.name),
      axisLabel: { width: 150, overflow: "truncate" },
    },
    series: [
      {
        type: "bar",
        data: d.map((x) => x.value),
        itemStyle: { color: "#2d6a8a", borderRadius: [0, 5, 5, 0] },
        emphasis: { focus: "self", itemStyle: { opacity: 0.78 } },
      },
    ],
  };
});
function median(values: number[]) {
  const x = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!x.length) return 0;
  const m = Math.floor(x.length / 2);
  return x.length % 2 ? x[m] : (x[m - 1] + x[m]) / 2;
}
function rawMetrics(code: string) {
  const ps = s.data?.projects.filter((p) => shareFor(p, code) > 0) || [];
  const persons = uniquePeople(code);
  const roster = s.data?.facultyProfiles?.find((x) => x.faculty === code);
  const all = roster?.allLecturers || persons.length || 1;
  let total = 0,
    industry = 0;
  for (const p of ps) {
    const share = shareFor(p, code);
    for (const c of projectComponents.value.get(p.projectId) || []) {
      total += c.value * share;
      if (c.category === "Industri") industry += c.value * share;
    }
  }
  const h = persons
    .map((x) => x.hIndex)
    .filter((x): x is number => x !== null && x !== undefined);
  const recent = persons.reduce(
    (sum, x) => sum + (x.paper2024 || 0) + (x.paper2025 || 0),
    0,
  );
  return {
    fundingPerLecturer: total / all,
    participation: persons.length / all,
    medianH: median(h),
    papersPerLecturer: recent / all,
    projectsPerLecturer: ps.length / all,
    industryShare: total ? industry / total : 0,
  };
}
const facultyCodes = computed(
  () =>
    s.data?.facultyProfiles
      ?.map((x) => x.faculty)
      .filter((x) => x && x !== "Not in 822 master") || [],
);
const selectedRaw = computed(() => rawMetrics(faculty.value));
const metricKeys = [
  "fundingPerLecturer",
  "participation",
  "medianH",
  "papersPerLecturer",
  "projectsPerLecturer",
  "industryShare",
] as const;
function percentile(value: number, values: number[]) {
  if (!values.length) return 0;
  return Math.round(
    (values.filter((x) => x <= value).length / values.length) * 100,
  );
}
const radarScores = computed(() =>
  metricKeys.map((k) =>
    percentile(
      selectedRaw.value[k],
      facultyCodes.value.map((code) => rawMetrics(code)[k]),
    ),
  ),
);
const medianRadarScores = computed(() =>
  metricKeys.map((k) => {
    const raw = facultyCodes.value.map((code) => rawMetrics(code)[k]);
    return percentile(median(raw), raw);
  }),
);
const radarOption = computed(() => ({
  tooltip: {},
  legend: { bottom: 0, data: [faculty.value, "Median UMS"] },
  radar: {
    center: ["50%", "46%"],
    radius: "66%",
    splitNumber: 5,
    indicator: [
      { name: "Dana / dosen", max: 100 },
      { name: "Partisipasi", max: 100 },
      { name: "Median h-index", max: 100 },
      { name: "Publikasi / dosen", max: 100 },
      { name: "Proyek / dosen", max: 100 },
      { name: "Share industri", max: 100 },
    ],
    axisName: { color: "#33443c", fontSize: 11 },
    splitArea: { areaStyle: { color: ["#f7faf8", "#eef5f1"] } },
  },
  series: [
    {
      type: "radar",
      data: [
        {
          value: radarScores.value,
          name: faculty.value,
          areaStyle: { color: "#17644855" },
          lineStyle: { color: "#176448" },
          itemStyle: { color: "#176448" },
        },
        {
          value: medianRadarScores.value,
          name: "Median UMS",
          areaStyle: { color: "#64748b22" },
          lineStyle: { color: "#64748b", type: "dashed" },
          itemStyle: { color: "#64748b" },
        },
      ],
    },
  ],
}));
const radarTable = computed(() => [
  [
    "Pendanaan per dosen",
    rpFull(selectedRaw.value.fundingPerLecturer),
    radarScores.value[0],
  ],
  [
    "Participation rate",
    `${(selectedRaw.value.participation * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`,
    radarScores.value[1],
  ],
  [
    "Median h-index",
    selectedRaw.value.medianH.toLocaleString("id-ID", {
      maximumFractionDigits: 1,
    }),
    radarScores.value[2],
  ],
  [
    "Publikasi 2024–2025 per dosen",
    selectedRaw.value.papersPerLecturer.toLocaleString("id-ID", {
      maximumFractionDigits: 2,
    }),
    radarScores.value[3],
  ],
  [
    "Proyek terlibat per dosen",
    selectedRaw.value.projectsPerLecturer.toLocaleString("id-ID", {
      maximumFractionDigits: 2,
    }),
    radarScores.value[4],
  ],
  [
    "Share pendapatan industri",
    `${(selectedRaw.value.industryShare * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`,
    radarScores.value[5],
  ],
]);
</script>

<template>
  <div v-if="!s.data" class="loading">Memuat detail fakultas…</div>
  <div v-else class="faculty-detail">
    <div class="faculty-breadcrumb">
      <RouterLink to="/">Dasbor</RouterLink><span>›</span
      ><strong>{{ faculty }}</strong>
    </div>
    <section class="faculty-hero">
      <div>
        <span class="eyebrow">RINGKASAN FAKULTAS</span>
        <h1>{{ faculty }}</h1>
        <p>
          Ringkasan pendanaan, program studi, proyek, personel, laboratorium,
          dan kapasitas riset.
        </p>
      </div>
      <RouterLink class="back-dashboard" to="/">← Kembali ke dasbor</RouterLink>
    </section>

    <section class="faculty-kpis">
      <article>
        <span>Total pendanaan</span
        ><strong>{{ rpShort(componentValue.total) }}</strong
        ><small
          >{{
            (
              (componentValue.total /
                s.data.annual.reduce((a, b) => a + b.total, 0)) *
              100
            ).toLocaleString("id-ID", { maximumFractionDigits: 1 })
          }}% dari institusi</small
        >
      </article>
      <article>
        <span>Proyek / catatan</span
        ><strong>{{ projects.length.toLocaleString("id-ID") }}</strong
        ><small>{{ prodiRows.length }} program studi terlibat</small>
      </article>
      <article>
        <span>Personel terlibat</span
        ><strong>{{ people.length.toLocaleString("id-ID") }}</strong
        ><small>{{ allLecturers }} dosen dalam roster</small>
      </article>
      <article>
        <span>Participation rate</span
        ><strong
          >{{
            (participation * 100).toLocaleString("id-ID", {
              maximumFractionDigits: 1,
            })
          }}%</strong
        ><small>Personel terlibat ÷ roster fakultas</small>
      </article>
      <article>
        <span>Pendapatan laboratorium</span
        ><strong>{{ rpShort(componentValue.laboratory) }}</strong
        ><small>{{ labs.length }} catatan laboratorium</small>
      </article>
      <article>
        <span>Pendapatan industri</span
        ><strong>{{ rpShort(componentValue.industry) }}</strong
        ><small
          >{{
            componentValue.total
              ? (
                  (componentValue.industry / componentValue.total) *
                  100
                ).toLocaleString("id-ID", { maximumFractionDigits: 1 })
              : 0
          }}% dari fakultas</small
        >
      </article>
    </section>
    <section class="faculty-main-grid">
      <article class="card chart-card">
        <div class="section-head">
          <div>
            <h2>Sumber Pendanaan</h2>
            <p>10 sumber dengan nilai atribusi terbesar</p>
          </div>
        </div>
        <InteractiveChart
          class="faculty-chart"
          :option="sourceOption"
          clickable-category-axis="y"
          full-row-clickable
          @click="openSourceModal"
          @category="openSourceModal"
        />
      </article>
      <article class="card chart-card">
        <div class="section-head">
          <div>
            <h2>Distribusi Program Studi</h2>
            <p>
              Pendanaan menurut program studi (klik bar untuk melihat rincian)
            </p>
          </div>
        </div>
        <InteractiveChart
          class="faculty-chart prodi-chart"
          :style="{ height: `${prodiChartHeight}px` }"
          :option="prodiOption"
          clickable-category-axis="y"
          full-row-clickable
          @click="openProdiModal"
          @category="openProdiCategory"
        />
      </article>
      <article class="card chart-card">
        <div class="section-head">
          <div>
            <h2>Tren Pendanaan</h2>
            <p>Industri dan non-industri per tahun</p>
          </div>
        </div>
        <InteractiveChart
          class="faculty-chart"
          :option="annualOption"
          @click="openAnnualModal"
        />
      </article>
      <article class="card radar-values">
        <div class="section-head">
          <div>
            <h2>Indikator Kapasitas Riset</h2>
            <p>Nilai dan posisi relatif setiap indikator</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Indikator</th>
              <th>Nilai</th>
              <th>Posisi relatif</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in radarTable" :key="String(r[0])">
              <td>{{ r[0] }}</td>
              <td>{{ r[1] }}</td>
              <td>
                <b>{{ r[2] }}/100</b>
              </td>
            </tr>
          </tbody>
        </table>
      </article>
      <article class="card chart-card">
        <div class="section-head">
          <div>
            <h2>Profil Kapasitas Riset</h2>
            <p>Perbandingan indikator utama fakultas</p>
          </div>
        </div>
        <InteractiveChart class="radar-chart" :option="radarOption" />
      </article>
      <article v-if="labs.length" class="card chart-card">
        <div class="section-head">
          <div>
            <h2>Pendapatan Laboratorium</h2>
            <p>Pendapatan menurut program studi pemilik</p>
          </div>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Tahun</th>
                <th>Program studi/unit</th>
                <th>Bidang THE</th>
                <th>Nilai</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in labs" :key="p.projectId">
                <td>{{ p.year }}</td>
                <td>{{ displayProdiName(p.ownerProdi || "") }}</td>
                <td>{{ p.subject }}</td>
                <td>
                  <b>{{ rpFull(p.value) }}</b>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </section>
  </div>
  <div
    v-if="prodiModalOpen"
    class="prodi-modal-overlay"
    @click.self="closeProdiModal"
  >
    <section
      class="prodi-modal"
      role="dialog"
      aria-modal="true"
      :aria-label="`Rincian ${selectedProdiName}`"
    >
      <button
        class="prodi-modal-close"
        aria-label="Tutup modal"
        @click="closeProdiModal"
      >
        ×</button
      ><span class="eyebrow">RINCIAN PROGRAM STUDI</span>
      <h2>{{ displayProdiName(selectedProdiName) }}</h2>
      <div class="prodi-modal-summary">
        <div>
          <span>Total pendanaan</span
          ><strong>{{ rpFull(selectedProdiRow?.value || 0) }}</strong>
        </div>
        <div>
          <span>Jumlah proyek</span
          ><strong>{{ selectedProdiRow?.projectCount || 0 }}</strong>
        </div>
      </div>
      <div v-if="!selectedProdiProjects.length" class="empty">
        Tidak ada data proyek penelitian untuk program studi ini.
      </div>
      <div v-else class="prodi-modal-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Judul proyek</th>
              <th>Tahun</th>
              <th>Sumber pendanaan</th>
              <th>Kategori</th>
              <th>Nominal</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in pagedProdiProjects" :key="row.project.projectId">
              <td>
                <b>{{ row.project.title }}</b
                ><small
                  >{{ row.project.program }} · {{ row.project.subject }}</small
                >
              </td>
              <td>{{ row.project.year }}</td>
              <td>{{ row.project.sourceStandard }}</td>
              <td>{{ row.project.categories.join(" + ") }}</td>
              <td>
                <b>{{ rpFull(row.attribution) }}</b>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="selectedProdiProjects.length" class="faculty-pagination">
        <button :disabled="prodiProjectPage === 1" @click="prodiProjectPage--">
          Sebelumnya</button
        ><span
          >Halaman {{ prodiProjectPage }} dari {{ prodiProjectPageCount }}</span
        ><button
          :disabled="prodiProjectPage === prodiProjectPageCount"
          @click="prodiProjectPage++"
        >
          Berikutnya
        </button>
      </div>
    </section>
  </div>
  <div
    v-if="sourceModalOpen"
    class="prodi-modal-overlay"
    @click.self="closeSourceModal"
  >
    <section
      class="prodi-modal source-detail-modal"
      role="dialog"
      aria-modal="true"
      :aria-label="`Rincian ${selectedSourceName}`"
    >
      <button
        class="prodi-modal-close"
        aria-label="Tutup modal"
        @click="closeSourceModal"
      >
        ×</button
      ><span class="eyebrow">RINCIAN SUMBER PENDANAAN</span>
      <h2>{{ selectedSourceName }}</h2>
      <div class="prodi-modal-summary">
        <div>
          <span>Total pendanaan</span
          ><strong>{{ rpFull(sourceModalTotal) }}</strong>
        </div>
        <div>
          <span>Jumlah proyek</span
          ><strong>{{ sourceModalProjects.length }}</strong>
        </div>
      </div>
      <div v-if="!sourceModalProjects.length" class="empty">
        Tidak ada proyek untuk sumber pendanaan ini.
      </div>
      <div v-else class="prodi-modal-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Judul Proyek</th>
              <th>Tahun</th>
              <th>Program Studi</th>
              <th>Kategori</th>
              <th>Nominal</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in pagedSourceModalProjects"
              :key="row.project.projectId"
            >
              <td>
                <b>{{ row.project.title }}</b
                ><small
                  >{{ row.project.program }} · {{ row.project.subject }}</small
                >
              </td>
              <td>{{ row.project.year }}</td>
              <td>{{ row.prodi }}</td>
              <td>{{ row.project.categories.join(" + ") }}</td>
              <td>
                <b>{{ rpFull(row.attribution) }}</b>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="sourceModalProjects.length" class="faculty-pagination">
        <button
          :disabled="sourceProjectPage === 1"
          @click="sourceProjectPage--"
        >
          Sebelumnya</button
        ><span
          >Halaman {{ sourceProjectPage }} dari
          {{ sourceProjectPageCount }}</span
        ><button
          :disabled="sourceProjectPage === sourceProjectPageCount"
          @click="sourceProjectPage++"
        >
          Berikutnya
        </button>
      </div>
    </section>
  </div>
  <div
    v-if="annualModalOpen"
    class="prodi-modal-overlay"
    @click.self="closeAnnualModal"
  >
    <section
      class="prodi-modal annual-detail-modal"
      role="dialog"
      aria-modal="true"
      :aria-label="`Rincian Pendanaan ${annualModalCategory} ${annualModalYear}`"
    >
      <button
        class="prodi-modal-close"
        aria-label="Tutup modal"
        @click="closeAnnualModal"
      >
        ×</button
      ><span class="eyebrow">RINCIAN TREN PENDANAAN</span>
      <h2>
        Rincian Pendanaan {{ annualModalCategory }} — {{ annualModalYear }}
      </h2>
      <div class="prodi-modal-summary">
        <div>
          <span>Total pendanaan</span
          ><strong>{{ rpFull(annualModalTotal) }}</strong>
        </div>
        <div>
          <span>Jumlah proyek</span
          ><strong>{{ annualModalProjects.length }}</strong>
        </div>
      </div>
      <div v-if="!annualModalProjects.length" class="empty">
        Tidak ada pendanaan atau proyek untuk kombinasi ini pada filter aktif.
      </div>
      <div v-else class="prodi-modal-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Judul Proyek</th>
              <th>Program Studi</th>
              <th>Sumber Pendanaan</th>
              <th>Kategori</th>
              <th>Nominal</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in pagedAnnualModalProjects"
              :key="row.project.projectId"
            >
              <td>
                <b>{{ row.project.title }}</b
                ><small
                  >{{ row.project.program }} · {{ row.project.subject }}</small
                >
              </td>
              <td>{{ row.prodi }}</td>
              <td>{{ row.project.sourceStandard }}</td>
              <td>{{ row.project.categories.join(" + ") }}</td>
              <td>
                <b>{{ rpFull(row.attribution) }}</b>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="annualModalProjects.length" class="faculty-pagination">
        <button :disabled="annualModalPage === 1" @click="annualModalPage--">
          Sebelumnya</button
        ><span
          >Halaman {{ annualModalPage }} dari {{ annualModalPageCount }}</span
        ><button
          :disabled="annualModalPage === annualModalPageCount"
          @click="annualModalPage++"
        >
          Berikutnya
        </button>
      </div>
    </section>
  </div>
</template>
