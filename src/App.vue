<template>
  <div class="app-shell">
    <!-- Keep the global nav persistent while route views swap underneath it. -->
    <GlobalNav />
    <RouterView />
  </div>
</template>

<script setup>
import { RouterView } from "vue-router";

import GlobalNav from "./components/common/GlobalNav.vue";

// App.vue only composes the shared frame for the rest of the game.
</script>
