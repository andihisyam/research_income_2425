<script setup lang="ts">
import {nextTick,onBeforeUnmount,onMounted,ref,watch} from 'vue'
import VChart from 'vue-echarts'

const props=defineProps<{option:any;clickableCategoryAxis?:'x'|'y';fullRowClickable?:boolean}>()
const emit=defineEmits<{click:[event:any];blank:[];category:[dataIndex:number]}>()
const chart=ref<any>()
const shell=ref<HTMLElement>()
let zr:any
function axisData(){return props.clickableCategoryAxis==='y'?props.option?.yAxis?.data:props.option?.xAxis?.data}
function gridValue(value:any,total:number,fallback:number){if(typeof value==='number')return value;if(typeof value==='string'&&value.endsWith('%'))return total*parseFloat(value)/100;return fallback}
function categoryAt(event:MouseEvent){
 const data=axisData();if(!props.fullRowClickable||!data?.length||!shell.value)return null
 const rect=shell.value.getBoundingClientRect();const x=event.clientX-rect.left;const y=event.clientY-rect.top
 const total=props.clickableCategoryAxis==='y'?rect.height:rect.width
 const grid=Array.isArray(props.option?.grid)?props.option.grid[0]:props.option?.grid||{}
 const start=props.clickableCategoryAxis==='y'?gridValue(grid.top,total,0):gridValue(grid.left,total,0)
 const end=props.clickableCategoryAxis==='y'?total-gridValue(grid.bottom,total,0):total-gridValue(grid.right,total,0)
 const crossStart=props.clickableCategoryAxis==='y'?gridValue(grid.left,rect.width,0):gridValue(grid.top,rect.height,0)
 const crossEnd=props.clickableCategoryAxis==='y'?rect.width-gridValue(grid.right,rect.width,0):rect.height-gridValue(grid.bottom,rect.height,0)
 const position=props.clickableCategoryAxis==='y'?y:x
 const crossPosition=props.clickableCategoryAxis==='y'?x:y
 if(crossPosition<crossStart||crossPosition>crossEnd)return null
 if(position<start||position>end)return null
 const index=Math.floor((position-start)/((end-start)/data.length))
 return index>=0&&index<data.length?index:null
}
function onChartClick(event:any){
 if(props.fullRowClickable){const directIndex=Number.isInteger(event?.dataIndex)?event.dataIndex:-1;const namedIndex=axisData()?.indexOf(event?.name)??-1;const index=directIndex>=0?directIndex:namedIndex;if(index>=0){emit('category',index);return}}
 emit('click',event)
}
const onBlank=(event:any)=>{
 if(event.target)return
 if(props.clickableCategoryAxis){
  const point=[event.offsetX,event.offsetY]
  const instance=chart.value
  if(instance?.containPixel?.({gridIndex:0},point)){
   const converted=instance.convertFromPixel({seriesIndex:0},point)
   const rawIndex=props.clickableCategoryAxis==='y'?converted?.[1]:converted?.[0]
   const dataIndex=Math.round(Number(rawIndex))
   const categoryCount=props.clickableCategoryAxis==='y'?props.option?.yAxis?.data?.length:props.option?.xAxis?.data?.length
   if(Number.isFinite(dataIndex)&&dataIndex>=0&&dataIndex<categoryCount){emit('category',dataIndex);return}
  }
 }
 emit('blank')
}
function bindBlank(){
 zr?.off('click',onBlank)
 zr=chart.value?.getZr?.()
 zr?.off('click',onBlank)
 zr?.on('click',onBlank)
}
onMounted(()=>nextTick(bindBlank))
watch(()=>props.option,()=>nextTick(bindBlank))
onBeforeUnmount(()=>zr?.off('click',onBlank))
</script>

<template><div ref="shell" class="interactive-chart-shell" :class="{'full-row-clickable':fullRowClickable}"><VChart ref="chart" :option="option" autoresize @click="onChartClick"/></div></template>
