<script setup lang="ts">
import {computed,onMounted,ref,watch} from 'vue'
import {use} from 'echarts/core'
import {CanvasRenderer} from 'echarts/renderers'
import {BarChart} from 'echarts/charts'
import {GridComponent,TooltipComponent,LegendComponent} from 'echarts/components'
import InteractiveChart from '../components/InteractiveChart.vue'
import {useDashboardStore} from '../stores/dashboard'
import {filteredProjects,filteredValue,groupWeighted,nextSelection,pct,rpFull,rpShort,type Filters,type Project} from '../lib/data'

use([CanvasRenderer,BarChart,GridComponent,TooltipComponent,LegendComponent])
const s=useDashboardStore()
onMounted(s.load)

const advanced=ref(false)
const sourceMode=ref<'sumber'|'program'>('sumber')
const showAllSources=ref(false)
const dimension=ref<'Fakultas'|'Program Studi'|'Bidang THE'>('Fakultas')
const query=ref('')
const sortKey=ref<keyof Project>('value')
const sortDir=ref(-1)
const page=ref(1)
const pageSize=10
const listOpen=ref(false)
const listScope=ref<Filters|null>(null)
const listTitle=ref('Proyek berdasarkan filter aktif')
const detailFromList=ref(false)

watch(()=>JSON.stringify(s.filters),()=>page.value=1)
watch(query,()=>page.value=1)

const faculties=computed(()=>[...new Set(s.data?.projects.flatMap(p=>p.faculties)||[])].sort())
const prodis=computed(()=>[...new Set((s.data?.projects||[]).filter(p=>s.filters.faculty==='Semua'||p.faculties.includes(s.filters.faculty)).flatMap(p=>p.prodis))].sort())
const sources=computed(()=>[...new Set(s.data?.components.map(c=>c.sourceStandard)||[])].sort())
const programs=computed(()=>[...new Set(s.data?.components.map(c=>c.program).filter(Boolean)||[])].sort())
const subjects=computed(()=>[...new Set(s.data?.components.map(c=>c.subject)||[])].sort())
const contextual=computed(()=>s.filters.faculty!=='Semua'||s.filters.prodi!=='Semua')
const kpiLabel=computed(()=>contextual.value?'Pendanaan Terpetakan (Atribusi Proporsional)':'Total Pendapatan Penelitian')
const yoy=computed(()=>{
 if(!s.data||s.filters.year!==2025)return null
 const prev=filteredValue(s.data.components,s.data.projects,{...s.filters,year:2024})
 return prev?{value:s.total-prev,rate:(s.total-prev)/prev*100}:null
})

const annualOption=computed(()=>{
 if(!s.data)return{}
 const vals=(year:number,cat:string)=>filteredValue(s.data!.components,s.data!.projects,{...s.filters,year,category:cat},cat)
 const ind=[vals(2024,'Industri'),vals(2025,'Industri')],non=[vals(2024,'Non-Industri'),vals(2025,'Non-Industri')]
 return{animationDuration:500,tooltip:{trigger:'axis',formatter:(ps:any[])=>{const i=ps[0].dataIndex,total=ind[i]+non[i];return `<b>${2024+i}</b><br>${ps.map(p=>`${p.marker}${p.seriesName}: ${rpFull(p.value)} (${pct(total?p.value/total*100:0)})`).join('<br>')}<br><b>Total: ${rpFull(total)}</b>`}},legend:{top:0},grid:{left:54,right:22,top:46,bottom:36},xAxis:{type:'category',data:['2024','2025']},yAxis:{type:'value',axisLabel:{formatter:(v:number)=>rpShort(v).replace('Rp','')}},series:[{name:'Industri',type:'bar',stack:'total',data:ind,itemStyle:{color:'#e09132'}},{name:'Non-Industri',type:'bar',stack:'total',data:non,itemStyle:{color:'#1d7a5d'},label:{show:true,position:'top',formatter:(p:any)=>rpShort(ind[p.dataIndex]+non[p.dataIndex])}}]}
})
function annualClick(e:any){
 const scope={...s.filters,year:Number(e.name),category:e.seriesName}
 openProjectList(`${e.seriesName} · ${e.name}`,scope)
}

const sourceRows=computed(()=>((sourceMode.value==='sumber'?s.sources:s.programs).slice(0,showAllSources.value?999:10)))
const sourceSelection=computed(()=>sourceMode.value==='sumber'?s.filters.source:s.filters.program)
const sourceSelectionLabel=computed(()=>sourceSelection.value==='Semua'?'':`${sourceSelection.value} dipilih`)
const rankingOption=computed(()=>{const d=[...sourceRows.value].reverse();return{tooltip:{trigger:'axis',axisPointer:{type:'shadow'},formatter:(p:any[])=>`${p[0].name}<br>${rpFull(p[0].value)}`},grid:{left:150,right:28,top:8,bottom:28},xAxis:{type:'value',axisLabel:{formatter:(v:number)=>rpShort(v).replace('Rp','')}},yAxis:{type:'category',data:d.map(x=>x.name),axisLabel:{width:135,overflow:'truncate'}},series:[{type:'bar',data:d.map(x=>x.value),itemStyle:{color:(p:any)=>d[p.dataIndex].name===sourceSelection.value?'#e09132':'#2d6a8a',borderRadius:[0,5,5,0]}}]}})
function sourceClick(e:any){if(sourceMode.value==='sumber')s.filters.source=nextSelection(s.filters.source,e.name);else s.filters.program=nextSelection(s.filters.program,e.name)}
function clearSource(){if(sourceMode.value==='sumber')s.filters.source='Semua';else s.filters.program='Semua'}

const dimensionRows=computed(()=>{
 if(!s.data)return[]
 if(dimension.value==='Bidang THE')return groupWeighted(s.data.components,s.data.projects,s.filters,c=>c.subject)
 const map=new Map<string,number>()
 for(const p of s.projects)for(const x of p.people){if(!x.matched)continue;const key=dimension.value==='Fakultas'?x.faculty:x.prodi;if((s.filters.faculty==='Semua'||x.faculty===s.filters.faculty)&&(s.filters.prodi==='Semua'||x.prodi===s.filters.prodi))map.set(key,(map.get(key)||0)+x.fractionalValue)}
 const allocated=[...map.values()].reduce((a,b)=>a+b,0)
 if(s.total>allocated)map.set('Belum terpetakan',s.total-allocated)
 return [...map].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value)
})
const dimensionSelection=computed(()=>dimension.value==='Fakultas'?s.filters.faculty:dimension.value==='Program Studi'?s.filters.prodi:s.filters.subject)
const dimensionOption=computed(()=>{const d=dimensionRows.value.slice(0,12).reverse();return{tooltip:{formatter:(p:any)=>`${p.name}<br>${rpFull(p.value)}`},grid:{left:145,right:24,top:8,bottom:28},xAxis:{type:'value',axisLabel:{formatter:(v:number)=>rpShort(v).replace('Rp','')}},yAxis:{type:'category',data:d.map(x=>x.name),axisLabel:{width:130,overflow:'truncate'}},series:[{type:'bar',data:d.map(x=>x.value),itemStyle:{color:(p:any)=>d[p.dataIndex].name==='Belum terpetakan'?'#94a3b8':d[p.dataIndex].name===dimensionSelection.value?'#e09132':'#5b7f37',borderRadius:[0,5,5,0]}}]}})
function dimensionClick(e:any){if(e.name==='Belum terpetakan')return;if(dimension.value==='Fakultas'){const next=nextSelection(s.filters.faculty,e.name);s.filters.faculty=next;s.filters.prodi='Semua'}else if(dimension.value==='Program Studi')s.filters.prodi=nextSelection(s.filters.prodi,e.name);else s.filters.subject=nextSelection(s.filters.subject,e.name)}
function clearDimension(){if(dimension.value==='Fakultas'){s.filters.faculty='Semua';s.filters.prodi='Semua'}else if(dimension.value==='Program Studi')s.filters.prodi='Semua';else s.filters.subject='Semua'}

const topProjects=computed(()=>[...s.projects].sort((a,b)=>b.value-a.value).slice(0,10))
const topProjectOption=computed(()=>{const d=[...topProjects.value].reverse();return{tooltip:{trigger:'axis',axisPointer:{type:'shadow'},formatter:(p:any[])=>`${p[0].name}<br>${rpFull(p[0].value)}`},grid:{left:180,right:26,top:8,bottom:28},xAxis:{type:'value',axisLabel:{formatter:(v:number)=>rpShort(v).replace('Rp','')}},yAxis:{type:'category',data:d.map(x=>x.title),axisLabel:{width:165,overflow:'truncate'}},series:[{type:'bar',data:d.map(x=>({value:x.value,projectId:x.projectId})),itemStyle:{color:'#176448',borderRadius:[0,5,5,0]}}]}})
function openTopProject(e:any){const project=s.projects.find(p=>p.projectId===e.data.projectId);if(project)openProject(project,false)}

const drawerProjects=computed(()=>!s.data?[]:filteredProjects(s.data.components,s.data.projects,listScope.value||s.filters))
const filteredTable=computed(()=>{const q=query.value.toLowerCase();return [...drawerProjects.value].filter(p=>`${p.title} ${p.sourceStandard} ${p.internalPeopleNames.join(' ')}`.toLowerCase().includes(q)).sort((a:any,b:any)=>{const av=a[sortKey.value],bv=b[sortKey.value];return (typeof av==='string'?av.localeCompare(bv):av-bv)*sortDir.value})})
const pageCount=computed(()=>Math.max(1,Math.ceil(filteredTable.value.length/pageSize)))
const paged=computed(()=>filteredTable.value.slice((page.value-1)*pageSize,page.value*pageSize))
function sort(k:keyof Project){if(sortKey.value===k)sortDir.value*=-1;else{sortKey.value=k;sortDir.value=-1}}
function openProjectList(title='Proyek berdasarkan filter aktif',scope:Filters|null=null){listTitle.value=title;listScope.value=scope?{...scope}:null;query.value='';page.value=1;listOpen.value=true}
function closeProjectList(){listOpen.value=false;listScope.value=null}
function openProject(project:Project,fromList:boolean){detailFromList.value=fromList;s.selectedProject=project}
function closeDetail(){s.selectedProject=null;if(!detailFromList.value)listOpen.value=false}
function exportCsv(){const rows=[['Tahun','Judul Proyek','Sumber Pendanaan','Kategori','Unit Pengelola','Nilai Pendanaan','Personel Internal'],...filteredTable.value.map(p=>[p.year,p.title,p.sourceStandard,p.categories.join(' + '),p.manager,p.value,p.internalPeopleNames.join('; ')])];const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv'}));a.download='proyek_teridentifikasi_ums_level_proyek.csv';a.click();URL.revokeObjectURL(a.href)}

const activeChips=computed(()=>Object.entries(s.filters).filter(([,v])=>v!=='Semua'&&v!==null).map(([k,v])=>({k,v,label:{year:'Tahun',category:'Kategori',source:'Sumber',program:'Program',faculty:'Fakultas',subject:'Bidang THE',prodi:'Prodi'}[k]})))
function clear(k:string){(s.filters as any)[k]=k==='year'?null:'Semua';if(k==='faculty')s.filters.prodi='Semua'}
</script>

<template><div v-if="!s.data" class="loading">Memuat snapshot data…</div><div v-else>
<section class="hero"><div><span class="eyebrow">MONITORING PENDAPATAN PENELITIAN</span><h1>Ringkasan dana riset UMS</h1><p>Baseline terverifikasi 2024–2025 · diperbarui {{new Date(s.data.generatedAt).toLocaleDateString('id-ID')}}</p></div><div class="hero-actions"><button class="primary explore" @click="openProjectList()">Telusuri Proyek</button><div class="baseline">Gabungan baseline<strong>{{rpShort(s.data.annual.reduce((a,b)=>a+b.total,0))}}</strong></div></div></section>
<section class="filters card"><div class="filter"><label>Tahun</label><select v-model="s.filters.year"><option :value="null">Semua Tahun</option><option :value="2024">2024</option><option :value="2025">2025</option></select></div><div class="filter"><label>Kategori Pendanaan</label><select v-model="s.filters.category"><option>Semua</option><option>Industri</option><option>Non-Industri</option></select></div><div class="filter"><label>Sumber</label><select v-model="s.filters.source"><option>Semua</option><option v-for="x in sources" :key="x">{{x}}</option></select></div><div class="filter"><label>Fakultas</label><select v-model="s.filters.faculty" @change="s.filters.prodi='Semua'"><option>Semua</option><option v-for="x in faculties" :key="x">{{x}}</option></select></div><button class="subtle" @click="advanced=!advanced">{{advanced?'Tutup':'Filter lanjutan'}}</button><button class="reset" @click="s.reset">Hapus filter</button><div v-if="advanced" class="advanced"><div class="filter"><label>Program / Skema</label><select v-model="s.filters.program"><option>Semua</option><option v-for="x in programs" :key="x">{{x}}</option></select></div><div class="filter"><label>Bidang THE</label><select v-model="s.filters.subject"><option>Semua</option><option v-for="x in subjects" :key="x">{{x}}</option></select></div><div class="filter"><label>Program Studi</label><select v-model="s.filters.prodi"><option>Semua</option><option v-for="x in prodis" :key="x">{{x}}</option></select></div></div></section>
<div class="sticky-chips" v-if="activeChips.length"><div class="chips"><button v-for="x in activeChips" :key="x.k" @click="clear(x.k)">{{x.label}}: {{x.v}} ×</button><button class="clear-all" @click="s.reset">Hapus semua</button></div></div>
<section class="kpis"><article class="kpi"><span>{{kpiLabel}}</span><strong>{{rpShort(s.total)}}</strong><small>{{contextual?'Nilai terpetakan; bukan total institusi':'Satu komponen dihitung sekali'}}</small><template v-if="yoy"><br><small :class="yoy.value<0?'down':'up'">{{pct(yoy.rate)}} · 2025 dibanding 2024</small></template></article><article class="kpi orange"><span>Pendapatan dari Industri</span><strong>{{rpShort(s.industry)}}</strong><small>{{contextual?'Atribusi proporsional':'Komponen baseline'}}</small></article><article class="kpi green"><span>Pendapatan Non-Industri</span><strong>{{rpShort(s.nonIndustry)}}</strong><small>{{contextual?'Atribusi proporsional':'Komponen baseline'}}</small></article><article class="kpi"><span>Jumlah Proyek Teridentifikasi</span><strong>{{s.projects.length.toLocaleString('id-ID')}}</strong><small>Proyek unik berdasarkan filter aktif</small></article></section>
<section class="card chart-card"><div class="section-head"><div><h2>Pendapatan Penelitian per Tahun</h2><p>Industri dan non-industri; klik segmen untuk membuka daftar proyek terkait</p></div></div><InteractiveChart class="chart main-chart" :option="annualOption" @click="annualClick"/></section>
<section class="two-col"><article class="card chart-card"><div class="section-head"><div><h2>Pendanaan menurut {{sourceMode==='sumber'?'Sumber Tercatat':'Program / Skema'}}</h2><p>Klik bar untuk memilih, klik ulang atau area kosong untuk menghapus pilihan</p></div><select v-model="sourceMode"><option value="sumber">Sumber</option><option value="program">Program</option></select></div><button v-if="sourceSelectionLabel" class="local-chip" @click="clearSource">{{sourceSelectionLabel}} ×</button><InteractiveChart class="chart" :option="rankingOption" @click="sourceClick" @blank="clearSource"/><button class="subtle" @click="showAllSources=!showAllSources">{{showAllSources?'Tampilkan 10 terbesar':'Lihat semua'}}</button></article><article class="card chart-card"><div class="section-head"><div><h2>Distribusi Pendanaan</h2><p>Klik bar untuk memilih, klik ulang atau area kosong untuk menghapus pilihan</p></div><select v-model="dimension"><option>Fakultas</option><option>Program Studi</option><option>Bidang THE</option></select></div><button v-if="dimensionSelection!=='Semua'" class="local-chip" @click="clearDimension">{{dimensionSelection}} dipilih ×</button><InteractiveChart class="chart" :option="dimensionOption" @click="dimensionClick" @blank="clearDimension"/></article></section>
<section class="card chart-card"><div class="section-head"><div><h2>Proyek Penelitian dengan Pendanaan Terbesar</h2><p>10 proyek dengan nilai terbesar berdasarkan filter aktif; klik bar untuk melihat rincian</p></div></div><div v-if="!topProjects.length" class="empty">Tidak ada proyek untuk filter ini</div><InteractiveChart v-else class="chart top-project-chart" :option="topProjectOption" @click="openTopProject"/></section>

<div v-if="listOpen" class="drawer-backdrop" @click.self="closeProjectList"><aside class="drawer project-list-drawer"><button class="close" @click="closeProjectList">×</button><span class="eyebrow">DAFTAR PROYEK</span><h2>{{listTitle}}</h2><p class="drawer-summary">{{filteredTable.length}} proyek teridentifikasi</p><div class="drawer-tools"><input class="search" v-model="query" placeholder="Cari judul proyek, nama personel, atau sumber…"/><button class="primary" @click="exportCsv">Unduh CSV</button></div><div v-if="!filteredTable.length" class="empty">Tidak ada data untuk lingkup ini</div><div v-else class="project-list"><button v-for="p in paged" :key="p.projectId" class="project-row" @click="openProject(p,true)"><span><b>{{p.title}}</b><small>{{p.year}} · {{p.sourceStandard}} · {{p.categories.join(' + ')}}</small></span><strong>{{rpFull(p.value)}}</strong></button></div><div class="sort-controls"><label>Urutkan</label><button @click="sort('value')">Nilai ↕</button><button @click="sort('year')">Tahun ↕</button><button @click="sort('title')">Judul ↕</button></div><div class="pagination"><button :disabled="page===1" @click="page--">Sebelumnya</button><span>Halaman {{page}} dari {{pageCount}}</span><button :disabled="page===pageCount" @click="page++">Berikutnya</button></div></aside></div>
<div v-if="s.selectedProject" class="drawer-backdrop detail-layer" @click.self="closeDetail"><aside class="drawer"><button class="close" @click="closeDetail">×</button><button v-if="detailFromList" class="back" @click="closeDetail">← Kembali ke daftar</button><span class="eyebrow">RINCIAN PROYEK</span><h2>{{s.selectedProject.title}}</h2><dl><div><dt>Tahun</dt><dd>{{s.selectedProject.year}}</dd></div><div><dt>Nilai proyek</dt><dd>{{rpFull(s.selectedProject.value)}}</dd></div><div><dt>Sumber tercatat</dt><dd>{{s.selectedProject.sourceStandard}}</dd></div><div><dt>Program / skema</dt><dd>{{s.selectedProject.program}}</dd></div><div><dt>Kategori</dt><dd>{{s.selectedProject.categories.join(' + ')}}</dd></div><div><dt>Unit pengelola</dt><dd>{{s.selectedProject.manager}}</dd></div><div><dt>Bidang THE</dt><dd>{{s.selectedProject.subject}}</dd></div><div><dt>Jumlah komponen</dt><dd>{{s.selectedProject.componentCount}}</dd></div></dl><h3>Personel internal</h3><ul><li v-for="x in s.selectedProject.people" :key="x.personKey"><b>{{x.name}}</b><span v-if="x.faculty||x.prodi">{{[x.faculty,x.prodi].filter(Boolean).join(' · ')}}</span></li><li v-if="!s.selectedProject.people.length">Tidak ada nama internal pada sumber.</li></ul><p class="notice" v-if="s.selectedProject.sourceStandard==='DPPM'">DPPM adalah label yang tercatat pada sumber; pemberi dana akhir belum diverifikasi.</p></aside></div>
</div></template>
