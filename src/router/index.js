import { createRouter, createWebHistory } from "vue-router";

import BattleView from "../views/BattleView.vue";
import HandbookView from "../views/HandbookView.vue";
import HomeView from "../views/HomeView.vue";
import InventoryView from "../views/InventoryView.vue";
import MapView from "../views/MapView.vue";
import PracticeView from "../views/PracticeView.vue";
import SkillTreeView from "../views/SkillTreeView.vue";

// 路由保持扁平，方便后续继续扩展新的主页面。
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
    },
    {
      path: "/map",
      name: "map",
      component: MapView,
    },
    {
      path: "/inventory",
      name: "inventory",
      component: InventoryView,
    },
    {
      path: "/skills",
      name: "skills",
      component: SkillTreeView,
    },
    {
      path: "/handbook",
      name: "handbook",
      component: HandbookView,
    },
    {
      path: "/practice",
      name: "practice",
      component: PracticeView,
    },
    {
      path: "/battle/:enemyId",
      name: "battle",
      component: BattleView,
      props: true,
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: "/",
    },
  ],
});

export default router;
