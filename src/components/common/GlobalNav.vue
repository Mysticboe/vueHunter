<template>
  <header class="global-nav">
    <div class="global-nav__brand">
      <RouterLink
        class="global-nav__title"
        to="/"
      >
        Vue Hunter
      </RouterLink>
      <span class="global-nav__subtitle">前端勇者试炼</span>
    </div>

    <!-- 顶部导航完全由数据驱动，新增主页面时只需要补一个条目。 -->
    <nav class="global-nav__links">
      <RouterLink
        v-for="link in links"
        :key="link.to"
        class="global-nav__link"
        :class="{ 'global-nav__link--active': route.path === link.to }"
        :to="link.to"
      >
        {{ link.label }}
      </RouterLink>
    </nav>

    <div class="global-nav__stats">
      <div class="global-nav__stat">
        <span>等级</span>
        <strong>{{ gameStore.player.level }}</strong>
      </div>
      <div class="global-nav__stat">
        <span>金币</span>
        <strong>{{ gameStore.player.gold }}</strong>
      </div>
      <div class="global-nav__stat">
        <span>技能点</span>
        <strong>{{ gameStore.player.skillPoints }}</strong>
      </div>
    </div>
  </header>
</template>

<script setup>
import { RouterLink, useRoute } from "vue-router";

import { useGameStore } from "../../stores/game";

// 直接读取路由和玩家状态，让整个外壳保持响应式而不需要层层传参。
const route = useRoute();
const gameStore = useGameStore();

// 所有主页面都保持平铺，方便玩家随时切换。
const links = [
  { label: "首页", to: "/" },
  { label: "地图", to: "/map" },
  { label: "背包", to: "/inventory" },
  { label: "技能树", to: "/skills" },
  { label: "图鉴", to: "/handbook" },
  { label: "练习", to: "/practice" },
];
</script>
