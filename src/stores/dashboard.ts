import {defineStore} from 'pinia'
import {computed,ref} from 'vue'
import type {DashboardData,Filters,Project} from '../lib/data'
import {defaultFilters,filteredProjects,filteredValue,groupWeighted} from '../lib/data'
export const useDashboardStore=defineStore('dashboard',()=>{
 const data=ref<DashboardData|null>(null),filters=ref<Filters>(defaultFilters()),selectedProject=ref<Project|null>(null)
 const load=async()=>{data.value=await fetch('./data/dashboard.json').then(r=>r.json())}
 const projects=computed(()=>data.value?filteredProjects(data.value.components,data.value.projects,filters.value):[])
 const total=computed(()=>data.value?filteredValue(data.value.components,data.value.projects,filters.value):0)
 const industry=computed(()=>data.value?filteredValue(data.value.components,data.value.projects,filters.value,'Industri'):0)
 const nonIndustry=computed(()=>data.value?filteredValue(data.value.components,data.value.projects,filters.value,'Non-Industri'):0)
 const sources=computed(()=>data.value?groupWeighted(data.value.components,data.value.projects,filters.value,c=>c.sourceStandard):[])
 const programs=computed(()=>data.value?groupWeighted(data.value.components,data.value.projects,filters.value,c=>c.program):[])
 const reset=()=>filters.value=defaultFilters()
 return{data,filters,selectedProject,load,projects,total,industry,nonIndustry,sources,programs,reset}
})
