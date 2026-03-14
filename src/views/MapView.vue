<template>
  <main class="page-shell map-view">
    <header class="hud-bar panel">
      <div>
        <div class="panel__eyebrow">World Map</div>
        <h1 class="panel__title">The continent is ready for the next hunt.</h1>
      </div>

      <div class="hud-stats">
        <div class="hud-stat">
          <span>HP / MP</span>
          <strong>{{ gameStore.player.hp }} / {{ gameStore.player.mp }}</strong>
        </div>
        <div class="hud-stat">
          <span>Level</span>
          <strong>{{ gameStore.player.level }}</strong>
        </div>
        <div class="hud-stat">
          <span>EXP</span>
          <strong>
            {{ gameStore.player.exp }}
            <template v-if="gameStore.nextLevelExp">
              / {{ gameStore.nextLevelExp }}
            </template>
          </strong>
        </div>
        <div class="hud-stat">
          <span>Gold</span>
          <strong>{{ gameStore.player.gold }}</strong>
        </div>
        <div class="hud-stat">
          <span>Skill points</span>
          <strong>{{ gameStore.player.skillPoints }}</strong>
        </div>
      </div>
    </header>

    <section
      v-if="!gameStore.hasProgress"
      class="panel empty-panel"
    >
      <div class="panel__eyebrow">No save loaded</div>
      <h2 class="panel__title">Start a new run to unlock the map.</h2>
      <button
        type="button"
        class="button button--primary"
        @click="startFreshRun"
      >
        Create fresh save
      </button>
    </section>

    <section
      v-else
      class="map-layout"
    >
      <div class="chapter-grid">
        <QuestBoard />

        <ChapterCard
          v-for="chapter in chapterCards"
          :key="chapter.id"
          :chapter="chapter"
          :enemies="chapter.enemies"
          :unlocked="chapter.unlocked"
          :cleared="chapter.cleared"
          :progress="chapter.progress"
          :cleared-enemies="gameStore.clearedEnemies"
          @challenge="startBattle"
        />
      </div>

      <aside class="map-sidebar">
        <section class="panel sidebar-card">
          <div class="panel__eyebrow">Hunter Sheet</div>
          <h2 class="panel__title">{{ gameStore.player.name }}</h2>
          <StatBar
            label="HP"
            :value="gameStore.player.hp"
            :max="gameStore.player.maxHp"
            tone="hp"
          />
          <StatBar
            label="MP"
            :value="gameStore.player.mp"
            :max="gameStore.player.maxMp"
            tone="mp"
          />
          <div class="summary-grid">
            <div>
              <span>Attack</span>
              <strong>{{ gameStore.player.attack }}</strong>
            </div>
            <div>
              <span>Defense</span>
              <strong>{{ gameStore.player.defense }}</strong>
            </div>
          </div>
          <div class="stack-actions">
            <button
              type="button"
              class="button button--ghost"
              @click="restAtCamp"
            >
              Rest at camp (14 gold)
            </button>
            <small
              v-if="campMessage"
              class="muted-copy"
            >
              {{ campMessage }}
            </small>
          </div>
        </section>

        <section class="panel sidebar-card">
          <div class="panel__eyebrow">Review Board</div>
          <h2 class="panel__title">Recent missed prompts</h2>
          <ul
            v-if="gameStore.recentWrongQuestions.length > 0"
            class="review-list"
          >
            <li
              v-for="entry in gameStore.recentWrongQuestions"
              :key="entry.id"
            >
              <strong>Q{{ entry.id }}</strong>
              <p>{{ entry.prompt }}</p>
              <small>Missed {{ entry.count }} time(s)</small>
            </li>
          </ul>
          <button
            v-if="gameStore.recentWrongQuestions.length > 0"
            type="button"
            class="button button--ghost"
            @click="router.push('/practice')"
          >
            Practice backlog
          </button>
          <p
            v-else
            class="muted-copy"
          >
            No missed prompts yet. Your notes are clean.
          </p>
        </section>

        <section class="panel sidebar-card">
          <div class="panel__eyebrow">Town Menu</div>
          <h2 class="panel__title">Manage your run</h2>
          <div class="stack-actions">
            <button
              type="button"
              class="button button--ghost"
              @click="router.push('/inventory')"
            >
              Open inventory
            </button>
            <button
              type="button"
              class="button button--ghost"
              @click="router.push('/skills')"
            >
              Open skill tree
            </button>
            <button
              type="button"
              class="button button--ghost"
              @click="router.push('/handbook')"
            >
              Open handbook
            </button>
            <button
              type="button"
              class="button button--ghost"
              @click="openChapterDrill"
            >
              Chapter drill
            </button>
            <button
              type="button"
              class="button button--ghost"
              @click="router.push('/')"
            >
              Back to home
            </button>
            <button
              type="button"
              class="button button--ghost"
              @click="resetRun"
            >
              Reset save
            </button>
          </div>
        </section>
      </aside>
    </section>
  </main>
</template>

<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

import QuestBoard from "../components/common/QuestBoard.vue";
import StatBar from "../components/common/StatBar.vue";
import ChapterCard from "../components/map/ChapterCard.vue";
import { chapters } from "../data/chapters";
import { enemies } from "../data/enemies";
import { useGameStore } from "../stores/game";

const router = useRouter();
const gameStore = useGameStore();
const campMessage = ref("");

const chapterCards = computed(() =>
  chapters.map((chapter) => {
    const chapterEnemies = enemies.filter((enemy) => enemy.chapterId === chapter.id);
    const progress = gameStore.chapterProgress(chapter.id);

    return {
      ...chapter,
      enemies: chapterEnemies,
      unlocked: gameStore.player.unlockedChapters.includes(chapter.id),
      cleared: progress.total > 0 && progress.cleared === progress.total,
      progress,
    };
  }),
);

const recommendedDrillChapterId = computed(() => {
  const targetChapterId = gameStore.nextTargetChapter?.id;

  if (gameStore.player.unlockedChapters.includes(targetChapterId)) {
    return targetChapterId;
  }

  return gameStore.player.unlockedChapters.at(-1) ?? 1;
});

function startFreshRun() {
  gameStore.startNewGame();
}

function startBattle(enemyId) {
  router.push(`/battle/${enemyId}`);
}

function openChapterDrill() {
  router.push({
    path: "/practice",
    query: {
      mode: "drill",
      chapter: String(recommendedDrillChapterId.value),
    },
  });
}

function resetRun() {
  gameStore.resetGame();
  router.push("/");
}

function restAtCamp() {
  const rested = gameStore.restAtCamp();

  campMessage.value = rested
    ? "You feel refreshed and ready for the next chapter."
    : "You need at least 14 gold to rest.";
}
</script>
