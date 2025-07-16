import { createWebHistory, createRouter } from "vue-router";

import Example from "@pages/Example.vue";
import Game from "@pages/Game.vue";

const routes = [
  { path: "/example", name: "example", component: Example },
  { path: "/game", name: "game", component: Game },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
