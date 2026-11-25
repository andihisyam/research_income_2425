import {describe,it,expect} from 'vitest'
import {annualBreakdown,defaultFilters,filteredProjects,filteredValue,groupWeighted,nextSelection,rpShort,type Component,type Project} from '../src/lib/data'
const projects:Project[]=[{projectId:'p1',year:2025,title:'A',manager:'U',subject:'Engineering',program:'S',sourceRaw:'X',sourceStandard:'X',categories:['Industri'],value:100,componentCount:1,people:[{personKey:'1',name:'A',faculty:'FT',prodi:'TE',personType:'lecturer',matchStatus:'matched',matched:true,fractionalValue:50},{personKey:'2',name:'B',faculty:'FEB',prodi:'M',personType:'lecturer',matchStatus:'matched',matched:true,fractionalValue:50}],internalPeopleNames:['A','B'],faculties:['FT','FEB'],prodis:['TE','M']}]
const components:Component[]=[{componentId:'c',projectId:'p1',year:2025,month:'Jan',manager:'U',subject:'Engineering',program:'S',sourceRaw:'X',sourceStandard:'X',sourceNote:'',category:'Industri',value:100,sourceCell:'A1'}]
describe('agregasi tunggal',()=>{it('menghitung baseline tanpa menggandakan relasi',()=>expect(filteredValue(components,projects,defaultFilters())).toBe(100));it('menggunakan atribusi proporsional untuk fakultas',()=>expect(filteredValue(components,projects,{...defaultFilters(),faculty:'FT'})).toBe(50));it('mengelompokkan sumber pada konteks filter',()=>expect(groupWeighted(components,projects,defaultFilters(),c=>c.sourceStandard)).toEqual([{name:'X',value:100}]));it('memformat rupiah Indonesia',()=>expect(rpShort(22614422028)).toContain('Rp22,61 miliar'))})

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
})
