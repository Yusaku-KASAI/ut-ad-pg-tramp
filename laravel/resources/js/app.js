import "./bootstrap";

import { createApp } from "vue";
import { router } from "./router.js";
import { createPinia } from "pinia";
import VueCesium from "vue-cesium";
import App from "./App.vue";

import "vue-cesium/dist/index.css";
import "cesium/Build/Cesium/Widgets/widgets.css";

createApp(App).use(router).use(createPinia()).use(VueCesium).mount("#app");
