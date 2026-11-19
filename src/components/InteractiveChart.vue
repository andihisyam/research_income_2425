<script setup lang="ts">
import {nextTick,onBeforeUnmount,onMounted,ref,watch} from 'vue'
import VChart from 'vue-echarts'

const props=defineProps<{option:any}>()
const emit=defineEmits<{click:[event:any];blank:[]}>()
const chart=ref<any>()
let zr:any
const onBlank=(event:any)=>{if(!event.target)emit('blank')}
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
