<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { BarChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from "echarts/components";
import InteractiveChart from "../components/InteractiveChart.vue";
import { useDashboardStore } from "../stores/dashboard";
import "../faculty.css";
import {
  annualBreakdown,
  baseMatch,
  displayProdiName,
  filteredProjects,
  filteredValue,
  nextSelection,
  pct,
  rpFull,
  rpShort,
  unitShare,
  type Filters,
  type Project,
} from "../lib/data";

use([
  CanvasRenderer,
  BarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
]);
const s = useDashboardStore();
const router = useRouter();

const advanced = ref(false);
const sourceMode = ref<"sumber" | "program">("sumber");
const showAllSources = ref(false);
const query = ref("");
const sortKey = ref<keyof Project>("value");
const sortDir = ref(-1);
const page = ref(1);
const pageSize = 10;
const listOpen = ref(false);
const listScope = ref<Filters | null>(null);
const listTitle = ref("Proyek berdasarkan filter aktif");
const detailFromList = ref(false);

watch(
  () => JSON.stringify(s.filters),
  () => (page.value = 1),
);
watch(query, () => (page.value = 1));

const faculties = computed(() =>
  [...new Set(s.data?.projects.flatMap((p) => p.faculties) || [])].sort(),
);
const prodis = computed(() =>
  [
    ...new Set(
      (s.data?.projects || [])
        .filter(
          (p) =>
            s.filters.faculty === "Semua" ||
            p.faculties.includes(s.filters.faculty),
        )
        .flatMap((p) => p.prodis),
    ),
  ].sort(),
);
const sources = computed(() =>
  [...new Set(s.data?.components.map((c) => c.sourceStandard) || [])].sort(),
);
const programs = computed(() =>
  [
    ...new Set(s.data?.components.map((c) => c.program).filter(Boolean) || []),
  ].sort(),
);
const subjects = computed(() =>
  [...new Set(s.data?.components.map((c) => c.subject) || [])].sort(),
);
const contextual = computed(
  () => s.filters.faculty !== "Semua" || s.filters.prodi !== "Semua",
);
const kpiLabel = computed(() =>
  contextual.value ? "Pendanaan Unit Terpilih" : "Total Pendapatan Penelitian",
);
const yoy = computed(() => {
  if (!s.data || s.filters.year !== 2025) return null;
  const prev = filteredValue(s.data.components, s.data.projects, {
    ...s.filters,
    year: 2024,
  });
  return prev
    ? { value: s.total - prev, rate: ((s.total - prev) / prev) * 100 }
    : null;
});

const annualOption = computed(() => {
  if (!s.data) return {};
  const breakdown = annualBreakdown(
    s.data.components,
    s.data.projects,
    s.filters,
  );
  const totals = breakdown.years.map((_, i) =>
    breakdown.series.reduce((sum, x) => sum + x.values[i], 0),
  );
  return {
    animationDuration: 500,
    tooltip: {
      trigger: "axis",
      formatter: (ps: any[]) => {
        const i = ps[0].dataIndex,
          total = totals[i];
        return `<b>${breakdown.years[i]}</b><br>${ps.map((p) => `${p.marker}${p.seriesName}: ${rpFull(p.value)} (${pct(total ? (p.value / total) * 100 : 0)})`).join("<br>")}<br><b>Total: ${rpFull(total)}</b>`;
      },
    },
    legend: { top: 0 },
    grid: { left: 54, right: 22, top: 46, bottom: 36 },
    xAxis: { type: "category", data: breakdown.years.map(String) },
    yAxis: {
      type: "value",
      axisLabel: { formatter: (v: number) => rpShort(v).replace("Rp", "") },
    },
    series: breakdown.series.map((x) => ({
      name: x.name,
      type: "bar",
      data: x.values,
      barMaxWidth: 100,
      itemStyle: {
        color: x.name === "Industri" ? "#e09132" : "#1d7a5d",
        borderRadius: [5, 5, 0, 0],
      },
      label: {
        show: true,
        position: "top",
        formatter: (p: any) => rpShort(p.value),
      },
    })),
  };
});
const annualModalOpen = ref(false);
const annualModalYear = ref<number | null>(null);
const annualModalCategory = ref("");
const annualModalPage = ref(1);
const annualModalProjects = computed(() => {
  if (!s.data || annualModalYear.value === null || !annualModalCategory.value)
    return [];
  const scope = {
    ...s.filters,
    year: annualModalYear.value,
    category: annualModalCategory.value,
  };
  return s.data.projects
    .map((project) => {
      const share = unitShare(project, scope);
      const attribution = s
        .data!.components.filter(
          (c) => c.projectId === project.projectId && baseMatch(c, scope),
        )
        .reduce((sum, c) => sum + c.value * share, 0);
      if (!attribution) return null;
      const prodis =
        project.manager === "Laboratorium" && project.ownerProdi
          ? [project.ownerProdi]
          : project.people
              .filter(
                (x) =>
                  x.matched &&
                  (scope.faculty === "Semua" || x.faculty === scope.faculty) &&
                  (scope.prodi === "Semua" || x.prodi === scope.prodi),
              )
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

const sourceRows = computed(() =>
  (sourceMode.value === "sumber" ? s.sources : s.programs).slice(
    0,
    showAllSources.value ? 999 : 10,
  ),
);
const sourceChartRows = computed(() => [...sourceRows.value].reverse());
const sourceSelection = computed(() =>
  sourceMode.value === "sumber" ? s.filters.source : s.filters.program,
);
const sourceSelectionLabel = computed(() =>
  sourceSelection.value === "Semua" ? "" : `${sourceSelection.value} dipilih`,
);
const rankingOption = computed(() => {
  const d = [...sourceRows.value].reverse();
  return {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "none" },
      confine: true,
      formatter: (p: any[]) => `${p[0].name}<br>${rpFull(p[0].value)}`,
    },
    grid: { left: 150, right: 28, top: 8, bottom: 28 },
    xAxis: {
      type: "value",
      axisLabel: { formatter: (v: number) => rpShort(v).replace("Rp", "") },
    },
    yAxis: {
      type: "category",
      data: d.map((x) => x.name),
      axisLabel: { width: 135, overflow: "truncate" },
    },
    series: [
      {
        type: "bar",
        data: d.map((x) => x.value),
        itemStyle: {
          color: (p: any) =>
            d[p.dataIndex].name === sourceSelection.value
              ? "#e09132"
              : "#2d6a8a",
          borderRadius: [0, 5, 5, 0],
        },
        emphasis: { focus: "self", itemStyle: { opacity: 0.78 } },
      },
    ],
  };
});
function selectSource(name: string) {
  if (!name) return;
  if (sourceMode.value === "sumber")
    s.filters.source = nextSelection(s.filters.source, name);
  else s.filters.program = nextSelection(s.filters.program, name);
}
function sourceClick(event: any) {
  selectSource(String(event?.name || ""));
}
function clearSource() {
  if (sourceMode.value === "sumber") s.filters.source = "Semua";
  else s.filters.program = "Semua";
}
const sourceModalOpen = ref(false);
const selectedSourceName = ref("");
const sourceModalProjects = computed(() => {
  const name = selectedSourceName.value;
  if (!name || !s.data) return [];
  return s.data.projects
    .map((project) => {
      const share = unitShare(project, s.filters);
      if (share <= 0) return null;
      const attribution = s
        .data!.components.filter(
          (c) =>
            c.projectId === project.projectId &&
            c.sourceStandard === name &&
            baseMatch(c, s.filters),
        )
        .reduce((sum, c) => sum + c.value * share, 0);
      if (!attribution) return null;
      const prodis =
        project.manager === "Laboratorium" && project.ownerProdi
          ? [project.ownerProdi]
          : project.people
              .filter(
                (x) =>
                  x.matched &&
                  (s.filters.faculty === "Semua" ||
                    x.faculty === s.filters.faculty) &&
                  (s.filters.prodi === "Semua" || x.prodi === s.filters.prodi),
              )
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
const sourceModalPage = ref(1);
const sourceModalPageCount = computed(() =>
  Math.max(1, Math.ceil(sourceModalProjects.value.length / 10)),
);
const pagedSourceModalProjects = computed(() =>
  sourceModalProjects.value.slice(
    (sourceModalPage.value - 1) * 10,
    sourceModalPage.value * 10,
  ),
);
function openSourceModal(payload: any) {
  const name =
    typeof payload === "number"
      ? sourceChartRows.value[payload]?.name
      : payload?.name || payload?.data?.name;
  if (sourceMode.value !== "sumber") return selectSource(String(name || ""));
  selectedSourceName.value = String(name || "");
  sourceModalPage.value = 1;
  sourceModalOpen.value = Boolean(name);
}
function closeSourceModal() {
  sourceModalOpen.value = false;
}
function onDashboardEscape(event: KeyboardEvent) {
  if (event.key === "Escape") {
    closeSourceModal();
    closeAnnualModal();
  }
}
watch(selectedSourceName, () => {
  sourceModalPage.value = 1;
});
onMounted(() => {
  if (!s.data) s.load();
  window.addEventListener("keydown", onDashboardEscape);
});
onBeforeUnmount(() => window.removeEventListener("keydown", onDashboardEscape));

const facultyRows = computed(() => {
  if (!s.data) return [];
  const map = new Map<string, number>();
  for (const p of s.projects) {
    if (p.manager === "Laboratorium") {
      if (p.ownerFaculty)
        map.set(p.ownerFaculty, (map.get(p.ownerFaculty) || 0) + p.value);
      continue;
    }
    for (const x of p.people) {
      if (!x.matched) continue;
      if (
        (s.filters.faculty === "Semua" || x.faculty === s.filters.faculty) &&
        (s.filters.prodi === "Semua" || x.prodi === s.filters.prodi)
      )
        map.set(x.faculty, (map.get(x.faculty) || 0) + x.fractionalValue);
    }
  }
  return [...map]
    .filter(([name]) => name !== "Not in 822 master")
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
});
const facultyChartRows = computed(() =>
  facultyRows.value.slice(0, 12).reverse(),
);

const facultyOption = computed(() => {
  const d = facultyChartRows.value;
  return {
    tooltip: {
      formatter: (p: any) =>
        `${p.name}<br>${rpFull(p.value)}<br><small>Klik untuk membuka detail fakultas</small>`,
    },
    grid: { left: 120, right: 24, top: 8, bottom: 28 },
    xAxis: {
      type: "value",
      axisLabel: { formatter: (v: number) => rpShort(v).replace("Rp", "") },
    },
    yAxis: { type: "category", data: d.map((x) => x.name) },
    series: [
      {
        type: "bar",
        data: d.map((x) => x.value),
        itemStyle: { color: "#5b7f37", borderRadius: [0, 5, 5, 0] },
      },
    ],
  };
});
function facultyClick(e: any) {
  router.push(`/faculty/${encodeURIComponent(e.name)}`);
}
function facultyCategoryClick(dataIndex: number) {
  const row = facultyChartRows.value[dataIndex];
  if (row) router.push(`/faculty/${encodeURIComponent(row.name)}`);
}

const topProjects = computed(() =>
  [...s.projects].sort((a, b) => b.value - a.value).slice(0, 10),
);
const topProjectRows = computed(() => [...topProjects.value].reverse());
const topProjectOption = computed(() => {
  const d = topProjectRows.value;
  return {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (p: any[]) => `${p[0].name}<br>${rpFull(p[0].value)}`,
    },
    grid: { left: 180, right: 26, top: 8, bottom: 28 },
    xAxis: {
      type: "value",
      axisLabel: { formatter: (v: number) => rpShort(v).replace("Rp", "") },
    },
    yAxis: {
      type: "category",
      data: d.map((x) => x.title),
      axisLabel: { width: 165, overflow: "truncate" },
    },
    series: [
      {
        type: "bar",
        data: d.map((x) => ({ value: x.value, projectId: x.projectId })),
        itemStyle: { color: "#176448", borderRadius: [0, 5, 5, 0] },
      },
    ],
  };
});
function openTopProject(e: any) {
  const project = s.projects.find((p) => p.projectId === e.data.projectId);
  if (project) openProject(project, false);
}
function openTopProjectCategory(dataIndex: number) {
  const project = topProjectRows.value[dataIndex];
  if (project) openProject(project, false);
}

const drawerProjects = computed(() =>
  !s.data
    ? []
    : filteredProjects(
        s.data.components,
        s.data.projects,
        listScope.value || s.filters,
      ),
);
const filteredTable = computed(() => {
  const q = query.value.toLowerCase();
  return [...drawerProjects.value]
    .filter((p) =>
      `${p.title} ${p.sourceStandard} ${p.internalPeopleNames.join(" ")}`
        .toLowerCase()
        .includes(q),
    )
    .sort((a: any, b: any) => {
      const av = a[sortKey.value],
        bv = b[sortKey.value];
      return (
        (typeof av === "string" ? av.localeCompare(bv) : av - bv) *
        sortDir.value
      );
    });
});
const pageCount = computed(() =>
  Math.max(1, Math.ceil(filteredTable.value.length / pageSize)),
);
const paged = computed(() =>
  filteredTable.value.slice((page.value - 1) * pageSize, page.value * pageSize),
);
function sort(k: keyof Project) {
  if (sortKey.value === k) sortDir.value *= -1;
  else {
    sortKey.value = k;
    sortDir.value = -1;
  }
}
function openProjectList(
  title = "Proyek berdasarkan filter aktif",
  scope: Filters | null = null,
) {
  listTitle.value = title;
  listScope.value = scope ? { ...scope } : null;
  query.value = "";
  page.value = 1;
  listOpen.value = true;
}
function closeProjectList() {
  listOpen.value = false;
  listScope.value = null;
}
function openProject(project: Project, fromList: boolean) {
  detailFromList.value = fromList;
  s.selectedProject = project;
}
function closeDetail() {
  s.selectedProject = null;
  if (!detailFromList.value) listOpen.value = false;
}
function exportCsv() {
  const rows = [
    [
      "Tahun",
      "Judul Proyek",
      "Sumber Pendanaan",
      "Kategori",
      "Unit Pengelola",
      "Nilai Pendanaan",
      "Personel Internal",
    ],
    ...filteredTable.value.map((p) => [
      p.year,
      p.title,
      p.sourceStandard,
      p.categories.join(" + "),
      p.manager,
      p.value,
      p.internalPeopleNames.join("; "),
    ]),
  ];
  const csv = rows
    .map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob(["\ufeff" + csv], { type: "text/csv" }),
  );
  a.download = "proyek_teridentifikasi_ums_level_proyek.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

const activeChips = computed(() =>
  Object.entries(s.filters)
    .filter(([, v]) => v !== "Semua" && v !== null)
    .map(([k, v]) => ({
      k,
      v,
      label: {
        year: "Tahun",
        category: "Kategori",
        source: "Sumber",
        program: "Program",
        faculty: "Fakultas",
        subject: "Bidang THE",
        prodi: "Prodi",
      }[k],
    })),
);
function clear(k: string) {
  (s.filters as any)[k] = k === "year" ? null : "Semua";
  if (k === "faculty") s.filters.prodi = "Semua";
}
</script>

<template>
  <div v-if="!s.data" class="loading">Memuat snapshot data…</div>
  <div v-else>
    <section class="hero">
      <div>
        <span class="eyebrow">MONITORING PENDAPATAN PENELITIAN</span>
        <h1>Ringkasan dana riset UMS</h1>
        <p>
          Data pendapatan penelitian 2024–2025 · diperbarui
          {{ new Date(s.data.generatedAt).toLocaleDateString("id-ID") }}
        </p>
      </div>
      <div class="hero-actions">
        <button class="primary explore" @click="openProjectList()">
          Telusuri Proyek
        </button>
      </div>
    </section>

    <section class="filters card">
      <div class="filter">
        <label>Tahun</label
        ><select v-model="s.filters.year">
          <option :value="null">Semua Tahun</option>
          <option :value="2024">2024</option>
          <option :value="2025">2025</option>
        </select>
      </div>
      <div class="filter">
        <label>Kategori Pendanaan</label
        ><select v-model="s.filters.category">
          <option>Semua</option>
          <option>Industri</option>
          <option>Non-Industri</option>
        </select>
      </div>
      <div class="filter">
        <label>Sumber</label
        ><select v-model="s.filters.source">
          <option>Semua</option>
          <option v-for="x in sources" :key="x">{{ x }}</option>
        </select>
      </div>
      <div class="filter">
        <label>Fakultas</label
        ><select
          v-model="s.filters.faculty"
          @change="s.filters.prodi = 'Semua'"
        >
          <option>Semua</option>
          <option v-for="x in faculties" :key="x">{{ x }}</option>
        </select>
      </div>
      <button class="subtle" @click="advanced = !advanced">
        {{ advanced ? "Tutup" : "Filter lanjutan" }}</button
      ><button class="reset" @click="s.reset">Hapus filter</button>
      <div v-if="advanced" class="advanced">
        <div class="filter">
          <label>Program / Skema</label
          ><select v-model="s.filters.program">
            <option>Semua</option>
            <option v-for="x in programs" :key="x">{{ x }}</option>
          </select>
        </div>
        <div class="filter">
          <label>Bidang THE</label
          ><select v-model="s.filters.subject">
            <option>Semua</option>
            <option v-for="x in subjects" :key="x">{{ x }}</option>
          </select>
        </div>
        <div class="filter">
          <label>Program Studi</label
          ><select v-model="s.filters.prodi">
            <option>Semua</option>
            <option v-for="x in prodis" :key="x" :value="x">
              {{ displayProdiName(x) }}
            </option>
          </select>
        </div>
      </div>
    </section>
    <div class="sticky-chips" v-if="activeChips.length">
      <div class="chips">
        <button v-for="x in activeChips" :key="x.k" @click="clear(x.k)">
          {{ x.label }}: {{ x.v }} ×</button
        ><button class="clear-all" @click="s.reset">Hapus semua</button>
      </div>
    </div>
    <section class="kpis">
      <article class="kpi">
        <span>{{ kpiLabel }}</span
        ><strong>{{ rpShort(s.total) }}</strong
        ><small>{{
          contextual
            ? "Atribusi personel dan pendapatan laboratorium unit"
            : "Satu komponen dihitung sekali"
        }}</small
        ><template v-if="yoy"
          ><br /><small :class="yoy.value < 0 ? 'down' : 'up'"
            >{{ pct(yoy.rate) }} · 2025 dibanding 2024</small
          ></template
        >
      </article>
      <article class="kpi orange">
        <span>Pendapatan dari Industri</span
        ><strong>{{ rpShort(s.industry) }}</strong
        ><small>{{
          contextual ? "Personel dan laboratorium unit" : "Komponen tercatat"
        }}</small>
      </article>
      <article class="kpi green">
        <span>Pendapatan Non-Industri</span
        ><strong>{{ rpShort(s.nonIndustry) }}</strong
        ><small>{{
          contextual ? "Personel dan laboratorium unit" : "Komponen tercatat"
        }}</small>
      </article>
      <article class="kpi">
        <span>Jumlah Proyek Teridentifikasi</span
        ><strong>{{ s.projects.length.toLocaleString("id-ID") }}</strong
        ><small>Proyek unik berdasarkan filter aktif</small>
      </article>
    </section>
    <section class="dashboard-overview-grid">
      <article class="card chart-card">
        <div class="section-head">
          <div>
            <h2>
              Pendanaan menurut
              {{
                sourceMode === "sumber" ? "Sumber Tercatat" : "Program / Skema"
              }}
            </h2>
            <p>
              Klik bar untuk memilih, klik ulang atau area kosong untuk
              menghapus pilihan
            </p>
          </div>
          <select v-model="sourceMode">
            <option value="sumber">Sumber</option>
            <option value="program">Program</option>
          </select>
        </div>
        <button
          v-if="sourceSelectionLabel"
          class="local-chip"
          @click="clearSource"
        >
          {{ sourceSelectionLabel }} ×</button
        ><InteractiveChart
          class="chart"
          :option="rankingOption"
          clickable-category-axis="y"
          full-row-clickable
          @click="openSourceModal"
          @category="openSourceModal"
          @blank="clearSource"
        /><button class="subtle" @click="showAllSources = !showAllSources">
          {{ showAllSources ? "Tampilkan 10 terbesar" : "Lihat semua" }}
        </button>
      </article>
      <article class="card chart-card">
        <div class="section-head">
          <div>
            <h2>Distribusi Pendanaan menurut Fakultas</h2>
            <p>
              Klik bar fakultas untuk membuka detail pendanaan, program studi,
              proyek, personel, dan kapasitas riset
            </p>
          </div>
        </div>
        <InteractiveChart
          class="chart"
          :option="facultyOption"
          clickable-category-axis="y"
          @click="facultyClick"
          @category="facultyCategoryClick"
        />
      </article>
      <article class="card chart-card">
        <div class="section-head">
          <div>
            <h2>Pendapatan Penelitian per Tahun</h2>
            <p>Industri dan non-industri (klik bar untuk melihat rincian)</p>
          </div>
        </div>
        <InteractiveChart
          class="chart main-chart"
          :option="annualOption"
          @click="openAnnualModal"
        />
      </article>
      <article class="card chart-card">
        <div class="section-head">
          <div>
            <h2>Proyek Penelitian dengan Pendanaan Terbesar</h2>
            <p>
              10 proyek dengan nilai terbesar berdasarkan filter aktif (klik bar
              untuk melihat rincian)
            </p>
          </div>
        </div>
        <div v-if="!topProjects.length" class="empty">
          Tidak ada proyek untuk filter ini
        </div>
        <InteractiveChart
          v-else
          class="chart top-project-chart"
          :option="topProjectOption"
          clickable-category-axis="y"
          @click="openTopProject"
          @category="openTopProjectCategory"
        />
      </article>
    </section>

    <div v-if="listOpen" class="drawer-backdrop" @click.self="closeProjectList">
      <aside class="drawer project-list-drawer">
        <button class="close" @click="closeProjectList">×</button
        ><span class="eyebrow">DAFTAR PROYEK</span>
        <h2>{{ listTitle }}</h2>
        <p class="drawer-summary">
          {{ filteredTable.length }} proyek teridentifikasi
        </p>
        <div class="drawer-tools">
          <input
            class="search"
            v-model="query"
            placeholder="Cari judul proyek, nama personel, atau sumber…"
          /><button class="primary" @click="exportCsv">Unduh CSV</button>
        </div>
        <div v-if="!filteredTable.length" class="empty">
          Tidak ada data untuk lingkup ini
        </div>
        <div v-else class="project-list">
          <button
            v-for="p in paged"
            :key="p.projectId"
            class="project-row"
            @click="openProject(p, true)"
          >
            <span
              ><b>{{ p.title }}</b
              ><small
                >{{ p.year }} · {{ p.sourceStandard }} ·
                {{ p.categories.join(" + ") }}</small
              ></span
            ><strong>{{ rpFull(p.value) }}</strong>
          </button>
        </div>
        <div class="sort-controls">
          <label>Urutkan</label><button @click="sort('value')">Nilai ↕</button
          ><button @click="sort('year')">Tahun ↕</button
          ><button @click="sort('title')">Judul ↕</button>
        </div>
        <div class="pagination">
          <button :disabled="page === 1" @click="page--">Sebelumnya</button
          ><span>Halaman {{ page }} dari {{ pageCount }}</span
          ><button :disabled="page === pageCount" @click="page++">
            Berikutnya
          </button>
        </div>
      </aside>
    </div>
    <div
      v-if="s.selectedProject"
      class="drawer-backdrop detail-layer"
      @click.self="closeDetail"
    >
      <aside class="drawer">
        <button class="close" @click="closeDetail">×</button
        ><button v-if="detailFromList" class="back" @click="closeDetail">
          ← Kembali ke daftar</button
        ><span class="eyebrow">RINCIAN PROYEK</span>
        <h2>{{ s.selectedProject.title }}</h2>
        <dl>
          <div>
            <dt>Tahun</dt>
            <dd>{{ s.selectedProject.year }}</dd>
          </div>
          <div>
            <dt>Nilai proyek</dt>
            <dd>{{ rpFull(s.selectedProject.value) }}</dd>
          </div>
          <div>
            <dt>Sumber tercatat</dt>
            <dd>{{ s.selectedProject.sourceStandard }}</dd>
          </div>
          <div>
            <dt>Program / skema</dt>
            <dd>{{ s.selectedProject.program }}</dd>
          </div>
          <div>
            <dt>Kategori</dt>
            <dd>{{ s.selectedProject.categories.join(" + ") }}</dd>
          </div>
          <div>
            <dt>Unit pengelola</dt>
            <dd>{{ s.selectedProject.manager }}</dd>
          </div>
          <div>
            <dt>Bidang THE</dt>
            <dd>{{ s.selectedProject.subject }}</dd>
          </div>
          <div>
            <dt>Jumlah komponen</dt>
            <dd>{{ s.selectedProject.componentCount }}</dd>
          </div>
        </dl>
        <h3>Personel internal</h3>
        <ul>
          <li v-for="x in s.selectedProject.people" :key="x.personKey">
            <b>{{ x.name }}</b
            ><span v-if="x.faculty || x.prodi">{{
              [x.faculty, x.prodi].filter(Boolean).join(" · ")
            }}</span>
          </li>
          <li v-if="!s.selectedProject.people.length">
            Tidak ada nama internal pada sumber.
          </li>
        </ul>
        <p class="notice" v-if="s.selectedProject.sourceStandard === 'DPPM'">
          DPPM adalah label yang tercatat pada sumber; pemberi dana akhir belum
          diverifikasi.
        </p>
      </aside>
    </div>
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
        Tidak ada proyek untuk sumber pendanaan ini pada filter aktif.
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
        <button :disabled="sourceModalPage === 1" @click="sourceModalPage--">
          Sebelumnya</button
        ><span
          >Halaman {{ sourceModalPage }} dari {{ sourceModalPageCount }}</span
        ><button
          :disabled="sourceModalPage === sourceModalPageCount"
          @click="sourceModalPage++"
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
