<template>
  <section class="panel quest-board">
    <div class="panel__eyebrow">Quest Board</div>
    <div class="quest-board__hero">
      <div>
        <h2 class="panel__title">{{ gameStore.activeQuest.title }}</h2>
        <p class="muted-copy">{{ gameStore.activeQuest.description }}</p>
      </div>
      <span class="chip">{{ gameStore.activeQuest.progressLabel }}</span>
    </div>

    <div class="quest-board__grid">
      <article
        v-for="entry in gameStore.questChecklist"
        :key="entry.title"
        class="quest-board__card"
      >
        <strong>{{ entry.title }}</strong>
        <p>{{ entry.body }}</p>
      </article>
    </div>
  </section>
</template>

<script setup>
import { useGameStore } from "../../stores/game";

const gameStore = useGameStore();
</script>
