<script setup lang="ts">
import {nextTick,onBeforeUnmount,onMounted,ref,watch} from 'vue'
import VChart from 'vue-echarts'

const props=defineProps<{option:any;clickableCategoryAxis?:'x'|'y'}>()
const emit=defineEmits<{click:[event:any];blank:[];category:[dataIndex:number]}>()
const chart=ref<any>()
let zr:any
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

<template><VChart ref="chart" :option="option" autoresize @click="emit('click',$event)"/></template>
