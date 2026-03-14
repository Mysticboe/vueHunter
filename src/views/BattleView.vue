<template>
  <main class="page-shell battle-view">
    <header class="battle-header">
      <button
        type="button"
        class="button button--ghost"
        @click="returnToMap"
      >
        Return to map
      </button>
      <div class="battle-header__meta">
        <span
          v-if="enemy"
          class="chip"
        >
          Encounter: {{ enemy.name }}
        </span>
        <span
          v-if="battleStore.isBossBattle"
          class="chip"
        >
          Boss Battle
        </span>
        <span class="chip">Turn {{ battleStore.turn }}</span>
      </div>
    </header>

    <!-- Show a clean fallback if the route points at an invalid enemy id. -->
    <section
      v-if="!enemy || !playerSnapshot"
      class="panel empty-panel"
    >
      <div class="panel__eyebrow">Invalid encounter</div>
      <h1 class="panel__title">This monster could not be loaded.</h1>
      <button
        type="button"
        class="button button--primary"
        @click="returnToMap"
      >
        Back to map
      </button>
    </section>

    <section
      v-else
      class="battle-layout"
    >
      <!-- The banner frames the region story, boss state, and current intent. -->
      <section
        class="panel boss-banner"
        :class="{ 'boss-banner--boss': battleStore.isBossBattle }"
      >
        <div class="panel__eyebrow">
          {{ battleStore.isBossBattle ? "Boss Protocol" : "Region Report" }}
        </div>
        <div class="boss-banner__layout">
          <div>
            <h2 class="panel__title">{{ chapter?.title ?? "Unknown Region" }}</h2>
            <p class="muted-copy">{{ chapter?.storyBeat ?? "The battlefield is unstable." }}</p>
          </div>
          <div class="boss-metrics">
            <span class="chip">Intent: {{ battleStore.enemyIntent }}</span>
            <span class="chip">Combo x{{ battleStore.comboStreak }}</span>
            <span
              v-if="battleStore.isBossBattle"
              class="chip"
            >
              Phase {{ battleStore.bossPhase }}
            </span>
          </div>
        </div>
      </section>

      <!-- Combatant cards keep both sides' stats visible during every turn. -->
      <div class="combatants-grid">
        <article class="panel combatant-card">
          <div class="panel__eyebrow">Hero</div>
          <h2 class="panel__title">{{ playerSnapshot.name }}</h2>
          <p class="combatant-card__subtitle">Level {{ playerSnapshot.level }} learner</p>
          <StatBar
            label="HP"
            :value="playerSnapshot.hp"
            :max="playerSnapshot.maxHp"
            tone="hp"
          />
          <StatBar
            label="MP"
            :value="playerSnapshot.mp"
            :max="playerSnapshot.maxMp"
            tone="mp"
          />
          <div class="summary-grid">
            <div>
              <span>Attack</span>
              <strong>{{ playerSnapshot.attack }}</strong>
            </div>
            <div>
              <span>Defense</span>
              <strong>{{ playerSnapshot.defense }}</strong>
            </div>
          </div>
        </article>

        <article class="panel combatant-card combatant-card--enemy">
          <div class="panel__eyebrow">Enemy</div>
          <h2 class="panel__title">{{ enemy.name }}</h2>
          <p class="combatant-card__subtitle">{{ enemy.role }} of chapter {{ enemy.chapterId }}</p>
          <StatBar
            label="HP"
            :value="battleStore.enemyHp"
            :max="enemy.maxHp"
            tone="enemy"
          />
          <div class="summary-grid">
            <div>
              <span>Attack</span>
              <strong>{{ enemy.attack }}</strong>
            </div>
            <div>
              <span>Defense</span>
              <strong>{{ enemy.defense }}</strong>
            </div>
          </div>
        </article>
      </div>

      <!-- QuestionPanel handles action choice and answer submission for each turn. -->
      <QuestionPanel
        :question="battleStore.currentQuestion"
        :selected-action="battleStore.selectedAction"
        :can-use-skill="battleStore.canUseSkill"
        :status="battleStore.status"
        :turn="battleStore.turn"
        :last-outcome="battleStore.lastOutcome"
        @select-action="battleStore.setSelectedAction"
        @answer="battleStore.submitAnswer"
        @next-turn="battleStore.advanceTurn"
      />

      <!-- Result banner is only shown once the encounter has resolved. -->
      <section
        v-if="battleStore.battleResult"
        class="panel result-banner"
      >
        <div class="panel__eyebrow">Battle Result</div>
        <h2 class="panel__title">{{ battleStore.battleResult.title }}</h2>
        <p>{{ battleStore.battleResult.message }}</p>
        <p v-if="battleStore.battleResult.rank">
          Rank: <span class="result-rank">{{ battleStore.battleResult.rank }}</span>
        </p>
        <p v-if="battleStore.status === 'victory'">
          EXP +{{ battleStore.battleResult.rewardExp }} |
          Gold +{{ battleStore.battleResult.rewardGold }}
        </p>
        <p v-if="battleStore.battleResult.perfectClear">
          Perfect clear achieved.
        </p>
        <p v-if="battleStore.battleResult.maxCombo">
          Max combo: x{{ battleStore.battleResult.maxCombo }}
        </p>
        <p v-if="rewardItemName">
          Loot acquired: {{ rewardItemName }}
        </p>
        <p v-if="battleStore.battleResult.rewardSkillPoints">
          Skill points +{{ battleStore.battleResult.rewardSkillPoints }}
        </p>
        <p v-if="battleStore.battleResult.leveledUp">
          Level up! You are now level {{ gameStore.player.level }}.
        </p>
        <p v-if="battleStore.battleResult.unlockedChapterId">
          Chapter {{ battleStore.battleResult.unlockedChapterId }} is now unlocked.
        </p>
        <p v-if="battleStore.status === 'defeat'">
          Recovery: HP {{ battleStore.battleResult.recoveryHp }} |
          MP {{ battleStore.battleResult.recoveryMp }}
        </p>
        <button
          type="button"
          class="button button--primary"
          @click="returnToMap"
        >
          Return to map
        </button>
      </section>

      <BattleLog :entries="battleStore.log" />
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, watch } from "vue";
import { onBeforeRouteLeave, useRoute, useRouter } from "vue-router";

import BattleLog from "../components/battle/BattleLog.vue";
import QuestionPanel from "../components/battle/QuestionPanel.vue";
import StatBar from "../components/common/StatBar.vue";
import { getChapterById } from "../data/chapters";
import { getItemById } from "../data/items";
import { useBattleStore } from "../stores/battle";
import { useGameStore } from "../stores/game";

// Battle view coordinates route params, persistent run state, and temporary battle state.
const route = useRoute();
const router = useRouter();
const battleStore = useBattleStore();
const gameStore = useGameStore();

// These computed values keep template bindings readable and focused.
const enemy = computed(() => battleStore.enemy);
const playerSnapshot = computed(() => battleStore.playerSnapshot);
const chapter = computed(() =>
  enemy.value ? getChapterById(enemy.value.chapterId) : null,
);
const rewardItemName = computed(() => {
  const rewardItemId = battleStore.battleResult?.rewardItemId;
  return rewardItemId ? getItemById(rewardItemId)?.name ?? null : null;
});

// Reload the encounter whenever the route param changes.
function loadBattle() {
  battleStore.startBattle(Number(route.params.enemyId));
}

// Leaving battle always commits current vitals before resetting temporary state.
function returnToMap() {
  battleStore.commitProgressOnExit();
  battleStore.resetBattle();
  router.push("/map");
}

onMounted(() => {
  if (!gameStore.hasProgress) {
    gameStore.startNewGame();
  }

  loadBattle();
});

// Route changes can happen from within the app, so watch the enemy id as well.
watch(
  () => route.params.enemyId,
  () => {
    loadBattle();
  },
);

// Defensive cleanup keeps stale battle data from leaking across routes.
onBeforeRouteLeave(() => {
  battleStore.commitProgressOnExit();
  battleStore.resetBattle();
});
</script>
