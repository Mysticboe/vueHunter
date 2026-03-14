<template>
  <header class="global-nav">
    <div class="global-nav__brand">
      <RouterLink
        class="global-nav__title"
        to="/"
      >
        Vue Hunter
      </RouterLink>
      <span class="global-nav__subtitle">Front-end Trial Ledger</span>
    </div>

    <!-- The nav stays route-driven so adding a new top-level screen is one data change. -->
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
        <span>Lvl</span>
        <strong>{{ gameStore.player.level }}</strong>
      </div>
      <div class="global-nav__stat">
        <span>Gold</span>
        <strong>{{ gameStore.player.gold }}</strong>
      </div>
      <div class="global-nav__stat">
        <span>SP</span>
        <strong>{{ gameStore.player.skillPoints }}</strong>
      </div>
    </div>
  </header>
</template>

<script setup>
import { RouterLink, useRoute } from "vue-router";

import { useGameStore } from "../../stores/game";

// Read route and player data once so the shell can stay reactive without prop-drilling.
const route = useRoute();
const gameStore = useGameStore();

// Top-level screens are intentionally flat and always available from the shell.
const links = [
  { label: "Home", to: "/" },
  { label: "Map", to: "/map" },
  { label: "Inventory", to: "/inventory" },
  { label: "Skills", to: "/skills" },
  { label: "Handbook", to: "/handbook" },
  { label: "Practice", to: "/practice" },
];
</script>
