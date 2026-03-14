<template>
  <div class="app-shell">
    <!-- 全局导航保持常驻，页面主体只切换当前路由视图。 -->
    <GlobalNav />
    <RouterView />
  </div>
</template>

<script setup>
import { RouterView } from "vue-router";

import GlobalNav from "./components/common/GlobalNav.vue";

// 这里是应用总外壳，只负责拼装常驻导航和当前路由页面。
</script>
