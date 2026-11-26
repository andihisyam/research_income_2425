import {describe,it,expect} from 'vitest'
import {adaptiveCategoryChartHeight,annualBreakdown,defaultFilters,filteredProjects,filteredValue,fundingDimensionMatch,groupWeighted,hasScrollBelow,interactiveBarStates,nextSelection,normalizedBarPercent,rpShort,type Component,type Project} from '../src/lib/data'
const projects:Project[]=[{projectId:'p1',year:2025,title:'A',manager:'U',subject:'Engineering',program:'S',sourceRaw:'X',sourceStandard:'X',categories:['Industri'],value:100,componentCount:1,people:[{personKey:'1',name:'A',faculty:'FT',prodi:'TE',personType:'lecturer',matchStatus:'matched',matched:true,fractionalValue:50},{personKey:'2',name:'B',faculty:'FEB',prodi:'M',personType:'lecturer',matchStatus:'matched',matched:true,fractionalValue:50}],internalPeopleNames:['A','B'],faculties:['FT','FEB'],prodis:['TE','M']}]
const components:Component[]=[{componentId:'c',projectId:'p1',year:2025,month:'Jan',manager:'U',subject:'Engineering',program:'S',sourceRaw:'X',sourceStandard:'X',sourceNote:'',category:'Industri',value:100,sourceCell:'A1'}]
describe('agregasi tunggal',()=>{it('menghitung baseline tanpa menggandakan relasi',()=>expect(filteredValue(components,projects,defaultFilters())).toBe(100));it('menggunakan atribusi proporsional untuk fakultas',()=>expect(filteredValue(components,projects,{...defaultFilters(),faculty:'FT'})).toBe(50));it('mengelompokkan sumber pada konteks filter',()=>expect(groupWeighted(components,projects,defaultFilters(),c=>c.sourceStandard)).toEqual([{name:'X',value:100}]));it('memformat rupiah Indonesia',()=>expect(rpShort(22614422028)).toContain('Rp22,61 miliar'))})
describe('tinggi grafik kategori',()=>{it('adaptif untuk sedikit kategori dan terus bertambah tanpa batas kanvas',()=>{expect(adaptiveCategoryChartHeight(2)).toBe(220);expect(adaptiveCategoryChartHeight(6)).toBe(418);expect(adaptiveCategoryChartHeight(20)).toBe(1230)})})
describe('petunjuk scroll',()=>{it('hanya tampil jika masih ada konten di bawah viewport',()=>{expect(hasScrollBelow(882,450,0)).toBe(true);expect(hasScrollBelow(882,450,432)).toBe(false);expect(hasScrollBelow(220,220,0)).toBe(false);expect(hasScrollBelow(882,450,200)).toBe(true)})})
describe('mini bar tabel',()=>{it('menggunakan skala bersama dan membatasi persentase',()=>{expect(normalizedBarPercent(50,100)).toBe(50);expect(normalizedBarPercent(150,100)).toBe(100);expect(normalizedBarPercent(20,0)).toBe(0)})})
describe('hover batang interaktif',()=>{it('menonjolkan batang aktif dan meredupkan batang lain',()=>{expect(interactiveBarStates.emphasis.focus).toBe('self');expect(interactiveBarStates.emphasis.itemStyle.opacity).toBe(1);expect(interactiveBarStates.blur.itemStyle.opacity).toBeLessThan(1)})})

describe('interaksi filter grafik',()=>{
 it('membuka dashboard tanpa filter tahun aktif',()=>{
  expect(defaultFilters().year).toBeNull()
 })
 it('memilih nilai baru dan menghapus nilai yang diklik ulang',()=>{
  expect(nextSelection('Semua','FT')).toBe('FT')
  expect(nextSelection('FT','FT')).toBe('Semua')
  expect(nextSelection('FT','FEB')).toBe('FEB')
 })
 it('menerapkan filter program pada nilai dan daftar proyek',()=>{
  const filters={...defaultFilters(),program:'S'}
  expect(filteredValue(components,projects,filters)).toBe(100)
  expect(filteredProjects(components,projects,filters)).toHaveLength(1)
  expect(filteredValue(components,projects,{...filters,program:'Program lain'})).toBe(0)
  expect(filteredProjects(components,projects,{...filters,program:'Program lain'})).toHaveLength(0)
 })
 it('mencocokkan rincian grafik berdasarkan sumber atau program',()=>{
  expect(fundingDimensionMatch(components[0],'sumber','X')).toBe(true)
  expect(fundingDimensionMatch(components[0],'program','S')).toBe(true)
  expect(fundingDimensionMatch(components[0],'program','Program lain')).toBe(false)
 })
 it('membatasi grafik tahunan pada tahun dan kategori yang difilter',()=>{
  expect(annualBreakdown(components,projects,{...defaultFilters(),year:2025,category:'Industri'})).toEqual({years:[2025],series:[{name:'Industri',values:[100]}]})
 })
 it('memetakan pendapatan laboratorium melalui unit pemilik',()=>{
  const labProject:Project={projectId:'lab',year:2025,title:'Pendapatan laboratorium',manager:'Laboratorium',subject:'Engineering',program:'Belum teridentifikasi',sourceRaw:'Laboratorium',sourceStandard:'Laboratorium',categories:['Industri'],value:200,componentCount:1,people:[],internalPeopleNames:[],faculties:['FT'],prodis:['Program Studi Teknik Sipil'],ownerFaculty:'FT',ownerProdi:'Program Studi Teknik Sipil'}
  const labComponent:Component={componentId:'lab-c',projectId:'lab',year:2025,month:'—',manager:'Laboratorium',subject:'Engineering',program:'Belum teridentifikasi',sourceRaw:'Laboratorium',sourceStandard:'Laboratorium',sourceNote:'',category:'Industri',value:200,sourceCell:'Laboratorium!F24'}
  expect(filteredValue([labComponent],[labProject],{...defaultFilters(),faculty:'FT'})).toBe(200)
  expect(filteredValue([labComponent],[labProject],{...defaultFilters(),faculty:'FIK'})).toBe(0)
  expect(filteredValue([labComponent],[labProject],{...defaultFilters(),prodi:'Program Studi Teknik Sipil'})).toBe(200)
 })
 it('memetakan proyek HIT langsung ke fakultas dan prodi pemilik',()=>{
  const hitProject:Project={projectId:'hit-1',year:2025,title:'Hibah HIT',manager:'DPPM',subject:'Belum terpetakan',program:'HIT',sourceRaw:'HIT',sourceStandard:'HIT',categories:['Non-Industri'],value:40000000,componentCount:1,people:[],internalPeopleNames:['Ketua HIT'],faculties:['FT'],prodis:['Program Studi Teknik Elektro'],ownerFaculty:'FT',ownerProdi:'Program Studi Teknik Elektro',status:'Monev'}
  const hitComponent:Component={componentId:'hit-1-dana',projectId:'hit-1',year:2025,month:'—',manager:'DPPM',subject:'Belum terpetakan',program:'HIT',sourceRaw:'HIT',sourceStandard:'HIT',sourceNote:'Dana hibah internal.',category:'Non-Industri',value:40000000,sourceCell:'1_Ajuan!ID=1'}
  expect(filteredValue([hitComponent],[hitProject],{...defaultFilters(),faculty:'FT'})).toBe(40000000)
  expect(filteredValue([hitComponent],[hitProject],{...defaultFilters(),faculty:'FEB'})).toBe(0)
  expect(filteredProjects([hitComponent],[hitProject],{...defaultFilters(),prodi:'Program Studi Teknik Elektro'})).toHaveLength(1)
  expect(filteredProjects([{...hitComponent,value:0}],[{...hitProject,value:0}],{...defaultFilters(),faculty:'FT'})).toHaveLength(1)
 })
})
