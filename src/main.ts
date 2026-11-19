import {createApp} from 'vue'
import {createPinia} from 'pinia'
import {createRouter,createWebHashHistory} from 'vue-router'
import App from './App.vue'
import DashboardView from './views/DashboardView.vue'
import MetadataView from './views/MetadataView.vue'
import './styles.css'
const router=createRouter({history:createWebHashHistory(),routes:[{path:'/',name:'Dasbor',component:DashboardView},{path:'/metadata',name:'Metadata',component:MetadataView}]})
createApp(App).use(createPinia()).use(router).mount('#app')
