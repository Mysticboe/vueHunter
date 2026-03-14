<template>
  <main class="page-shell battle-view">
    <header class="battle-header">
      <button
        type="button"
        class="button button--ghost"
        @click="returnToMap"
      >
        返回地图
      </button>
      <div class="battle-header__meta">
        <span
          v-if="enemy"
          class="chip"
        >
          遭遇：{{ enemy.name }}
        </span>
        <span
          v-if="battleStore.isBossBattle"
          class="chip"
        >
          Boss 战
        </span>
        <span class="chip">回合 {{ battleStore.turn }}</span>
      </div>
    </header>

    <!-- 如果路由里的敌人 id 无效，就显示一个安全兜底状态。 -->
    <section
      v-if="!enemy || !playerSnapshot"
      class="panel empty-panel"
    >
      <div class="panel__eyebrow">无效遭遇</div>
      <h1 class="panel__title">这只怪物没有成功加载出来。</h1>
      <button
        type="button"
        class="button button--primary"
        @click="returnToMap"
      >
        回到地图
      </button>
    </section>

    <section
      v-else
      class="battle-layout"
    >
      <!-- 顶部横幅集中展示章节剧情、Boss 状态和攻击意图。 -->
      <section
        class="panel boss-banner"
        :class="{ 'boss-banner--boss': battleStore.isBossBattle }"
      >
        <div class="panel__eyebrow">
          {{ battleStore.isBossBattle ? "Boss 协议" : "区域战报" }}
        </div>
        <div class="boss-banner__layout">
          <div>
            <h2 class="panel__title">{{ chapter?.title ?? "未知区域" }}</h2>
            <p class="muted-copy">{{ chapter?.storyBeat ?? "战场当前并不稳定。" }}</p>
          </div>
          <div class="boss-metrics">
            <span class="chip">意图：{{ battleStore.enemyIntent }}</span>
            <span class="chip">连击 x{{ battleStore.comboStreak }}</span>
            <span
              v-if="battleStore.isBossBattle"
              class="chip"
            >
              阶段 {{ battleStore.bossPhase }}
            </span>
          </div>
        </div>
      </section>

      <!-- 双方状态卡让玩家在每回合都能看到血量和属性变化。 -->
      <div class="combatants-grid">
        <article class="panel combatant-card">
          <div class="panel__eyebrow">勇者</div>
          <h2 class="panel__title">{{ playerSnapshot.name }}</h2>
          <p class="combatant-card__subtitle">等级 {{ playerSnapshot.level }} 的学习者</p>
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
              <span>攻击</span>
              <strong>{{ playerSnapshot.attack }}</strong>
            </div>
            <div>
              <span>防御</span>
              <strong>{{ playerSnapshot.defense }}</strong>
            </div>
          </div>
        </article>

        <article class="panel combatant-card combatant-card--enemy">
          <div class="panel__eyebrow">敌人</div>
          <h2 class="panel__title">{{ enemy.name }}</h2>
          <p class="combatant-card__subtitle">第 {{ enemy.chapterId }} 章的 {{ enemy.role }}</p>
          <StatBar
            label="HP"
            :value="battleStore.enemyHp"
            :max="enemy.maxHp"
            tone="enemy"
          />
          <div class="summary-grid">
            <div>
              <span>攻击</span>
              <strong>{{ enemy.attack }}</strong>
            </div>
            <div>
              <span>防御</span>
              <strong>{{ enemy.defense }}</strong>
            </div>
          </div>
        </article>
      </div>

      <!-- 题目面板负责本回合的行动选择和答题提交。 -->
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

      <!-- 战斗结束后才会显示最终结算面板。 -->
      <section
        v-if="battleStore.battleResult"
        class="panel result-banner"
      >
        <div class="panel__eyebrow">战斗结算</div>
        <h2 class="panel__title">{{ battleStore.battleResult.title }}</h2>
        <p>{{ battleStore.battleResult.message }}</p>
        <p v-if="battleStore.battleResult.rank">
          评级：<span class="result-rank">{{ battleStore.battleResult.rank }}</span>
        </p>
        <p v-if="battleStore.status === 'victory'">
          经验 +{{ battleStore.battleResult.rewardExp }} |
          金币 +{{ battleStore.battleResult.rewardGold }}
        </p>
        <p v-if="battleStore.battleResult.perfectClear">
          达成无错通关。
        </p>
        <p v-if="battleStore.battleResult.maxCombo">
          最高连击：x{{ battleStore.battleResult.maxCombo }}
        </p>
        <p v-if="rewardItemName">
          获得战利品：{{ rewardItemName }}
        </p>
        <p v-if="battleStore.battleResult.rewardSkillPoints">
          技能点 +{{ battleStore.battleResult.rewardSkillPoints }}
        </p>
        <p v-if="battleStore.battleResult.leveledUp">
          升级了！你现在是 {{ gameStore.player.level }} 级。
        </p>
        <p v-if="battleStore.battleResult.unlockedChapterId">
          已解锁第 {{ battleStore.battleResult.unlockedChapterId }} 章。
        </p>
        <p v-if="battleStore.status === 'defeat'">
          恢复后状态：HP {{ battleStore.battleResult.recoveryHp }} |
          MP {{ battleStore.battleResult.recoveryMp }}
        </p>
        <button
          type="button"
          class="button button--primary"
          @click="returnToMap"
        >
          返回地图
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

// 战斗页负责协调路由参数、持久进度和临时战斗状态。
const route = useRoute();
const router = useRouter();
const battleStore = useBattleStore();
const gameStore = useGameStore();

// 把模板里常用的对象抽成计算属性，减少阅读负担。
const enemy = computed(() => battleStore.enemy);
const playerSnapshot = computed(() => battleStore.playerSnapshot);
const chapter = computed(() =>
  enemy.value ? getChapterById(enemy.value.chapterId) : null,
);
const rewardItemName = computed(() => {
  const rewardItemId = battleStore.battleResult?.rewardItemId;
  return rewardItemId ? getItemById(rewardItemId)?.name ?? null : null;
});

// 路由参数变化时重新载入目标战斗。
function loadBattle() {
  battleStore.startBattle(Number(route.params.enemyId));
}

// 离开战斗前先把当前血蓝同步回主存档。
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

// 应用内跳转也可能更换敌人，因此额外监听路由参数。
watch(
  () => route.params.enemyId,
  () => {
    loadBattle();
  },
);

// 路由离开时清理临时战斗状态，避免脏数据串场。
onBeforeRouteLeave(() => {
  battleStore.commitProgressOnExit();
  battleStore.resetBattle();
});
</script>
