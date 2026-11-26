export type Category = "Industri" | "Non-Industri" | "Belum diklasifikasi";
export interface Person {
  personKey: string;
  name: string;
  faculty: string;
  prodi: string;
  personType: string;
  matchStatus: string;
  matched: boolean;
  fractionalValue: number;
  hIndex?: number | null;
  scholarlyOutput?: number | null;
  citations?: number | null;
  paper2024?: number | null;
  paper2025?: number | null;
}
export interface Component {
  componentId: string;
  projectId: string;
  year: number;
  month: string;
  manager: string;
  subject: string;
  program: string;
  sourceRaw: string;
  sourceStandard: string;
  sourceNote: string;
  category: Category;
  value: number;
  sourceCell: string;
}
export interface Project {
  projectId: string;
  year: number;
  title: string;
  manager: string;
  subject: string;
  program: string;
  sourceRaw: string;
  sourceStandard: string;
  categories: Category[];
  value: number;
  componentCount: number;
  people: Person[];
  internalPeopleNames: string[];
  faculties: string[];
  prodis: string[];
  ownerFaculty?: string;
  ownerProdi?: string;
  status?: string;
}
export interface FacultyProfile {
  faculty: string;
  allLecturers: number;
  uniqueInvolved: number;
  participationRate: number;
  medianFractional: number;
}
export interface DashboardData {
  generatedAt: string;
  sourceRevisionMtime: string;
  annual: {
    year: number;
    total: number;
    industry: number;
    nonIndustry: number;
    unclassified: number;
  }[];
  components: Component[];
  projects: Project[];
  facultyProfiles: FacultyProfile[];
  qa: Record<string, number>;
  groupingMethod: string;
}
export interface Filters {
  year: number | null;
  category: string;
  source: string;
  program: string;
  faculty: string;
  subject: string;
  prodi: string;
}
export const defaultFilters = (): Filters => ({
  year: null,
  category: "Semua",
  source: "Semua",
  program: "Semua",
  faculty: "Semua",
  subject: "Semua",
  prodi: "Semua",
});
export const rpFull = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  })
    .format(Math.round(n))
    .replace("Rp", "Rp");
export const rpShort = (n: number) => {
  const a = Math.abs(n),
    sign = n < 0 ? "−" : "";
  if (a >= 1e9)
    return `${sign}Rp${(a / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 2 })} miliar`;
  if (a >= 1e6)
    return `${sign}Rp${(a / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 2 })} juta`;
  return sign + rpFull(a);
};
export const pct = (n: number) =>
  `${n < 0 ? "−" : ""}${Math.abs(n).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
export const displayProdiName = (name: string) =>
  name.replace(/^Program Studi\s+/i, "").trim();
export const nextSelection = (current: string, clicked: string) =>
  current === clicked ? "Semua" : clicked;
export const fundingDimensionMatch = (
  component: Component,
  mode: "sumber" | "program",
  name: string,
) => (mode === "sumber" ? component.sourceStandard : component.program) === name;
export const adaptiveCategoryChartHeight = (count: number) =>
  Math.max(220, count * 58 + 70);
export const hasScrollBelow = (
  scrollHeight: number,
  clientHeight: number,
  scrollTop: number,
) =>
  scrollHeight > clientHeight + 1 &&
  scrollTop + clientHeight < scrollHeight - 1;
export const normalizedBarPercent = (value: number, maximum: number) =>
  maximum > 0 ? Math.max(0, Math.min(100, (value / maximum) * 100)) : 0;
export const interactiveBarStates = {
  emphasis: { focus: "self", itemStyle: { opacity: 1 } },
  blur: { itemStyle: { opacity: 0.28 } },
} as const;
export function baseMatch(c: Component, f: Filters) {
  return (
    (!f.year || c.year === f.year) &&
    (f.category === "Semua" || c.category === f.category) &&
    (f.source === "Semua" || c.sourceStandard === f.source) &&
    (f.program === "Semua" || c.program === f.program) &&
    (f.subject === "Semua" || c.subject === f.subject)
  );
}
export function unitShare(p: Project, f: Filters) {
  if (f.faculty === "Semua" && f.prodi === "Semua") return 1;
  if (p.ownerFaculty || p.ownerProdi) {
    return (f.faculty === "Semua" || p.ownerFaculty === f.faculty) &&
      (f.prodi === "Semua" || p.ownerProdi === f.prodi)
      ? 1
      : 0;
  }
  if (!p.value) return 0;
  return (
    p.people
      .filter(
        (x) =>
          x.matched &&
          (f.faculty === "Semua" || x.faculty === f.faculty) &&
          (f.prodi === "Semua" || x.prodi === f.prodi),
      )
      .reduce((s, x) => s + x.fractionalValue, 0) / p.value
  );
}
export function filteredValue(
  components: Component[],
  projects: Project[],
  f: Filters,
  category?: string,
) {
  const pm = new Map(projects.map((p) => [p.projectId, p]));
  return components
    .filter((c) => baseMatch(c, f) && (!category || c.category === category))
    .reduce((s, c) => s + c.value * unitShare(pm.get(c.projectId)!, f), 0);
}
export function filteredProjects(
  components: Component[],
  projects: Project[],
  f: Filters,
) {
  const projectMap = new Map(
    projects.map((project) => [project.projectId, project]),
  );
  const ids = new Set(
    components
      .filter((c) => baseMatch(c, f))
      .filter((c) => {
        const project = projectMap.get(c.projectId);
        return project ? unitShare(project, f) > 0 : false;
      })
      .map((c) => c.projectId),
  );
  return projects.filter((p) => ids.has(p.projectId));
}
export function groupWeighted(
  components: Component[],
  projects: Project[],
  f: Filters,
  key: (c: Component) => string,
) {
  const pm = new Map(projects.map((p) => [p.projectId, p])),
    m = new Map<string, number>();
  for (const c of components)
    if (baseMatch(c, f)) {
      const v = c.value * unitShare(pm.get(c.projectId)!, f);
      m.set(key(c), (m.get(key(c)) || 0) + v);
    }
  return [...m]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}
export function annualBreakdown(
  components: Component[],
  projects: Project[],
  f: Filters,
) {
  const years = f.year
    ? [f.year]
    : [...new Set(components.map((c) => c.year))].sort();
  const categories = (
    f.category === "Industri" || f.category === "Non-Industri"
      ? [f.category]
      : ["Industri", "Non-Industri"]
  ) as ("Industri" | "Non-Industri")[];
  return {
    years,
    series: categories.map((name) => ({
      name,
      values: years.map((year) =>
        filteredValue(
          components,
          projects,
          { ...f, year, category: name },
          name,
        ),
      ),
    })),
  };
}
