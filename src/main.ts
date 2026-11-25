import { createApp } from "vue";
import { createPinia } from "pinia";
import { createRouter, createWebHashHistory } from "vue-router";
import App from "./App.vue";
import DashboardView from "./views/DashboardView.vue";
import "./styles.css";
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", name: "Dasbor", component: DashboardView },
    {
      path: "/faculty/:code",
      name: "FacultyDetail",
      component: () => import("./views/FacultyDetailView.vue"),
    },
    {
      path: "/metadata",
      name: "Metadata",
      component: () => import("./views/MetadataView.vue"),
    },
  ],
});
createApp(App).use(createPinia()).use(router).mount("#app");
