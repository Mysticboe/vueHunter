<template>
  <div class="app-shell">
    <GlobalNav />
    <RouterView />
  </div>
</template>

<script setup>
import { RouterView } from "vue-router";

import GlobalNav from "./components/common/GlobalNav.vue";
</script>
