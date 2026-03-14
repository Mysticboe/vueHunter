<template>
  <main class="page-shell home-view">
    <section class="hero panel hero-panel">
      <div class="panel__eyebrow">Vue Hunter</div>
      <h1 class="hero__title">Front-end trials disguised as an RPG.</h1>
      <p class="hero__body">
        Learn Vue 3 one battle at a time. Answer knowledge prompts, deal damage,
        level up, and unlock the next zone of the continent.
      </p>

      <div class="hero__actions">
        <button
          type="button"
          class="button button--primary"
          @click="handleNewGame"
        >
          Start new run
        </button>
        <button
          type="button"
          class="button button--ghost"
          :disabled="!gameStore.hasProgress"
          @click="handleContinue"
        >
          Continue run
        </button>
      </div>

      <div class="hero__stats">
        <div class="hero-stat">
          <span class="hero-stat__label">Current build</span>
          <strong>{{ buildLabel }}</strong>
        </div>
        <div class="hero-stat">
          <span class="hero-stat__label">Playable chapters</span>
          <strong>{{ chapterCount }}</strong>
        </div>
        <div class="hero-stat">
          <span class="hero-stat__label">Question type</span>
          <strong>3 battle types</strong>
        </div>
      </div>
    </section>

    <section class="feature-grid">
      <article class="panel feature-card">
        <div class="panel__eyebrow">Loop</div>
        <h2 class="panel__title">Map -> Battle -> Reward</h2>
        <p>
          The core loop is already wired: pick a zone, survive a quiz duel, and
          collect progress.
        </p>
      </article>

      <article class="panel feature-card">
        <div class="panel__eyebrow">Learning</div>
        <h2 class="panel__title">Wrong answers stay useful</h2>
        <p>
          Missed prompts are stored in the save data so the handbook can surface
          what needs a rematch later.
        </p>
      </article>

      <article class="panel feature-card">
        <div class="panel__eyebrow">Bosses</div>
        <h2 class="panel__title">Boss fights now have phases</h2>
        <p>
          Late encounters can enrage mid-fight, change attack intent, and force a
          different rhythm than normal quiz battles.
        </p>
      </article>
    </section>

    <QuestBoard
      v-if="gameStore.hasProgress"
      class="home-view__quest-board"
    />
  </main>
</template>

<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";

import QuestBoard from "../components/common/QuestBoard.vue";
import { chapters } from "../data/chapters";
import { useGameStore } from "../stores/game";

const router = useRouter();
const gameStore = useGameStore();
const chapterCount = computed(() => chapters.length);
const buildLabel = computed(() => {
  const numerals = ["I", "II", "III", "IV", "V", "VI", "VII"];
  return `Alpha ${numerals[Math.max(0, chapterCount.value - 1)] ?? chapterCount.value}`;
});

function handleNewGame() {
  gameStore.startNewGame();
  router.push("/map");
}

function handleContinue() {
  if (!gameStore.hasProgress) {
    return;
  }

  router.push("/map");
}
</script>
