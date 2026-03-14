<template>
  <main class="page-shell utility-view">
    <header class="panel utility-header">
      <div>
        <div class="panel__eyebrow">Handbook</div>
        <h1 class="panel__title">Monster notes, chapter tags, and missed prompts.</h1>
      </div>
      <div class="page-links">
        <button
          type="button"
          class="button button--ghost"
          @click="router.push('/map')"
        >
          Map
        </button>
        <button
          type="button"
          class="button button--ghost"
          @click="router.push('/inventory')"
        >
          Inventory
        </button>
        <button
          type="button"
          class="button button--ghost"
          @click="router.push('/skills')"
        >
          Skill tree
        </button>
        <button
          type="button"
          class="button button--ghost"
          :disabled="!hasWrongQuestions"
          @click="openPractice({ filter: 'all' })"
        >
          Review
        </button>
      </div>
    </header>

    <section class="utility-grid">
      <!-- The codex reveals enemies only after the player has met them in battle. -->
      <section class="panel panel--wide">
        <div class="panel__eyebrow">Monster Codex</div>
        <h2 class="panel__title">Encountered foes</h2>
        <div class="card-list">
          <article
            v-for="enemy in codexEntries"
            :key="enemy.id"
            class="list-card"
            :class="{ 'list-card--locked': !enemy.encountered }"
          >
            <div>
              <strong>{{ enemy.encountered ? enemy.name : "Unknown enemy" }}</strong>
              <p>
                {{ enemy.encountered ? `${enemy.role} from chapter ${enemy.chapterId}` : "Meet this foe in battle to reveal its notes." }}
              </p>
              <small v-if="enemy.encountered">
                Rewards: {{ enemy.rewardExp }} EXP / {{ enemy.rewardGold }} gold
              </small>
            </div>
          </article>
        </div>
      </section>

      <!-- Milestones give the player persistent goals outside raw chapter completion. -->
      <section class="panel panel--wide">
        <div class="panel__eyebrow">Milestones</div>
        <h2 class="panel__title">Long-form progress</h2>
        <div class="card-list">
          <article
            v-for="card in gameStore.milestoneCards"
            :key="card.title"
            class="list-card"
            :class="{ 'list-card--locked': !card.unlocked }"
          >
            <div>
              <strong>{{ card.title }}</strong>
              <p>{{ card.body }}</p>
            </div>
            <span class="chip">{{ card.progressLabel }}</span>
          </article>
        </div>
      </section>

      <!-- Knowledge atlas doubles as a launchpad for chapter drill sessions. -->
      <section class="panel">
        <div class="panel__eyebrow">Knowledge Atlas</div>
        <h2 class="panel__title">Chapter tags</h2>
        <div class="card-list">
          <article
            v-for="chapter in chapters"
            :key="chapter.id"
            class="list-card list-card--stack"
          >
            <strong>{{ chapter.title }}</strong>
            <p>{{ chapter.subtitle }}</p>
            <div class="tag-row">
              <span
                v-for="point in chapter.knowledgePoints"
                :key="point"
                class="chip"
              >
                {{ point }}
              </span>
            </div>
            <div class="list-card__actions">
              <button
                type="button"
                class="button button--ghost"
                :disabled="!gameStore.player.unlockedChapters.includes(chapter.id)"
                @click="openPractice({ mode: 'drill', filter: chapter.id })"
              >
                Drill chapter
              </button>
            </div>
          </article>
        </div>
      </section>

      <!-- The wrong-answer book is the direct feed into focused review practice. -->
      <section class="panel panel--wide">
        <div class="panel__eyebrow">Wrong Answer Book</div>
        <div class="utility-header utility-header--compact">
          <h2 class="panel__title">Missed prompts ready for practice</h2>
          <div class="page-links">
            <button
              type="button"
              class="button button--primary"
              :disabled="filteredWrongQuestions.length === 0"
              @click="openPractice({ filter: activeFilter })"
            >
              Practice {{ activeFilter === "all" ? "this backlog" : `Chapter ${activeFilter}` }}
            </button>
            <button
              type="button"
              class="button button--ghost"
              :disabled="!hasWrongQuestions || activeFilter === 'all'"
              @click="openPractice({ filter: 'all' })"
            >
              Practice all
            </button>
          </div>
        </div>
        <div class="question-panel__chips">
          <button
            v-for="filter in filters"
            :key="filter.value"
            type="button"
            class="button"
            :class="activeFilter === filter.value ? 'button--primary' : 'button--ghost'"
            @click="activeFilter = filter.value"
          >
            {{ filter.label }}
          </button>
        </div>
        <div
          v-if="filteredWrongQuestions.length > 0"
          class="card-list"
        >
          <article
            v-for="entry in filteredWrongQuestions"
            :key="entry.id"
            class="list-card list-card--stack"
          >
            <strong>Q{{ entry.id }} | Chapter {{ entry.chapterId }}</strong>
            <p>{{ entry.prompt }}</p>
            <small>Answer: {{ entry.answer }} | Missed {{ entry.count }} time(s)</small>
            <p class="muted-copy">{{ entry.explanation }}</p>
          </article>
        </div>
        <p
          v-else
          class="muted-copy"
        >
          No wrong answers recorded for this filter yet.
        </p>
      </section>
    </section>
  </main>
</template>

<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

import { chapters } from "../data/chapters";
import { enemies } from "../data/enemies";
import { useGameStore } from "../stores/game";

// Handbook aggregates codex, milestones, chapter notes, and wrong-answer review tools.
const router = useRouter();
const gameStore = useGameStore();
const activeFilter = ref("all");
// This flag keeps review CTAs disabled until there is backlog to revisit.
const hasWrongQuestions = computed(() => gameStore.player.wrongQuestions.length > 0);

// Chapter filters are reused by the wrong-answer book to narrow the review list.
const filters = [
  { label: "All", value: "all" },
  ...chapters.map((chapter) => ({
    label: `Chapter ${chapter.id}`,
    value: chapter.id,
  })),
];

// Enrich enemies with encounter state for locked-versus-known codex rendering.
const codexEntries = computed(() =>
  enemies.map((enemy) => ({
    ...enemy,
    encountered: gameStore.encounteredEnemies.includes(enemy.id),
  })),
);

// Filter the wrong-answer book without mutating the stored backlog order.
const filteredWrongQuestions = computed(() => {
  if (activeFilter.value === "all") {
    return gameStore.player.wrongQuestions;
  }

  return gameStore.player.wrongQuestions.filter(
    (entry) => entry.chapterId === activeFilter.value,
  );
});

// Practice routing supports both review mode and explicit chapter drill mode.
function openPractice({ mode = "review", filter = "all" } = {}) {
  if (mode === "drill" && filter !== "all") {
    router.push({
      path: "/practice",
      query: {
        mode: "drill",
        chapter: String(filter),
      },
    });
    return;
  }

  if (filter === "all") {
    router.push("/practice");
    return;
  }

  router.push({
    path: "/practice",
    query: {
      chapter: String(filter),
    },
  });
}
</script>
