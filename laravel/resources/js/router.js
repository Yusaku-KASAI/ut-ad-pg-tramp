import { createWebHistory, createRouter } from "vue-router";

import Example from "@pages/Example.vue";
import Game from "@pages/Game.vue";
import Adventure from "@pages/Adventure.vue";

const routes = [
  { path: "/example", name: "example", component: Example },
  { path: "/game", name: "game", component: Game },
  { path: "/adventure", name: "adventure", component: Adventure },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
