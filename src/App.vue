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

// App.vue 只负责拼装整个项目的通用外壳。
</script>
