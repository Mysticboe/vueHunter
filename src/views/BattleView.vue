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
          首领战
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
      :class="battlefieldStateClass"
    >
      <!-- 顶部横幅集中展示章节剧情、首领状态和攻击意图。 -->
      <section
        class="panel boss-banner"
        :class="{ 'boss-banner--boss': battleStore.isBossBattle }"
      >
        <div class="panel__eyebrow">
          {{ battleStore.isBossBattle ? "首领预警" : "区域战报" }}
        </div>
        <div class="boss-banner__layout">
          <div>
            <h2 class="panel__title">{{ chapter?.title ?? "未知区域" }}</h2>
            <p class="muted-copy">{{ chapter?.storyBeat ?? "战场当前并不稳定。" }}</p>
          </div>
          <div class="boss-metrics">
            <span class="chip">意图：{{ battleStore.enemyIntent }}</span>
            <span
              v-if="shouldShowBattleForecast && battleStore.enemyPreview"
              class="chip"
            >
              技能：{{ battleStore.enemyPreview.skillName }}
            </span>
            <span
              v-if="shouldShowBattleForecast && battleStore.enemyPreview"
              class="chip"
              :class="`chip--${battleStore.enemyPreview.threatTone}`"
            >
              威胁：{{ battleStore.enemyPreview.threatLabel }}
            </span>
            <span class="chip">连击 x{{ battleStore.comboStreak }}</span>
            <span
              v-if="battleStore.isBossBattle"
              class="chip"
            >
              阶段 {{ battleStore.bossPhase }}
            </span>
          </div>
        </div>
        <div
          v-if="battleStore.activeBossEffects.length > 0"
          class="question-panel__chips boss-status-strip"
        >
          <span
            v-for="effect in battleStore.activeBossEffects"
            :key="effect.id"
            class="chip"
            :class="`chip--${effect.tone}`"
          >
            {{ effect.label }}：{{ effect.detail }}
          </span>
        </div>
      </section>

      <!-- 回合播报会把当前这一下最值得关注的事件单独强调出来。 -->
      <section
        v-if="battleAnnouncer"
        :key="battleAnnouncer.key"
        class="panel battle-announcer"
        :class="`battle-announcer--${battleAnnouncer.tone}`"
      >
        <div class="panel__eyebrow">回合播报</div>
        <div class="battle-announcer__layout">
          <div>
            <h2 class="panel__title">{{ battleAnnouncer.title }}</h2>
            <p class="muted-copy">{{ battleAnnouncer.body }}</p>
          </div>
          <span
            v-if="battleAnnouncer.badge"
            class="chip"
            :class="`chip--${battleAnnouncer.tone}`"
          >
            {{ battleAnnouncer.badge }}
          </span>
        </div>
      </section>

      <!-- 双方状态卡让玩家在每回合都能看到血量和属性变化。 -->
      <div class="combatants-grid">
        <article
          class="panel combatant-card"
          :class="playerCardStateClass"
        >
          <div
            v-if="playerImpactBadge"
            :key="playerImpactBadge.key"
            class="combatant-badge"
            :class="`combatant-badge--${playerImpactBadge.tone}`"
          >
            <strong>{{ playerImpactBadge.value }}</strong>
            <small>{{ playerImpactBadge.caption }}</small>
          </div>
          <div class="panel__eyebrow">勇者</div>
          <h2 class="panel__title">{{ playerSnapshot.name }}</h2>
          <p class="combatant-card__subtitle">等级 {{ playerSnapshot.level }} 的学习者</p>
          <p
            v-if="playerStatusLine"
            class="combatant-card__status"
          >
            {{ playerStatusLine }}
          </p>
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

        <article
          class="panel combatant-card combatant-card--enemy"
          :class="enemyCardStateClass"
        >
          <div
            v-if="enemyImpactBadge"
            :key="enemyImpactBadge.key"
            class="combatant-badge"
            :class="`combatant-badge--${enemyImpactBadge.tone}`"
          >
            <strong>{{ enemyImpactBadge.value }}</strong>
            <small>{{ enemyImpactBadge.caption }}</small>
          </div>
          <div class="panel__eyebrow">敌人</div>
          <h2 class="panel__title">{{ enemy.name }}</h2>
          <p class="combatant-card__subtitle">第 {{ enemy.chapterId }} 章的 {{ enemyRoleLabel }}</p>
          <p
            v-if="enemyStatusLine"
            class="combatant-card__status"
          >
            {{ enemyStatusLine }}
          </p>
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
        :combo-streak="battleStore.comboStreak"
        :enemy-preview="shouldShowBattleForecast ? battleStore.enemyPreview : null"
        :active-effects="battleStore.activeBossEffects"
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

      <BattleLog
        v-if="shouldShowBattleLog"
        :entries="battleStore.log"
      />
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
const lastOutcome = computed(() => battleStore.lastOutcome);
const chapter = computed(() =>
  enemy.value ? getChapterById(enemy.value.chapterId) : null,
);
const enemyRoleLabel = computed(() =>
  enemy.value?.role === "Boss" ? "首领" : enemy.value?.role ?? "未知敌人",
);
const rewardItemName = computed(() => {
  const rewardItemId = battleStore.battleResult?.rewardItemId;
  return rewardItemId ? getItemById(rewardItemId)?.name ?? null : null;
});
const shouldShowBattleEffects = computed(() => gameStore.preferences.showBattleEffects);
const shouldShowBattleAnnouncer = computed(() => gameStore.preferences.showBattleAnnouncer);
const shouldShowBattleForecast = computed(() => gameStore.preferences.showBattleForecast);
const shouldShowBattleLog = computed(() => gameStore.preferences.showBattleLog);

// 战场级状态会驱动整块区域的震动、闪烁和气氛变化。
const battlefieldStateClass = computed(() => {
  if (!shouldShowBattleEffects.value) {
    return null;
  }

  if (battleStore.status === "defeat") {
    return "battle-layout--defeat";
  }

  if (battleStore.status === "victory") {
    return "battle-layout--victory";
  }

  if (!lastOutcome.value) {
    return null;
  }

  if (lastOutcome.value.action === "guard" && lastOutcome.value.correct) {
    return "battle-layout--guard";
  }

  if (
    lastOutcome.value.playerDamage > 0 &&
    (lastOutcome.value.action === "skill" || lastOutcome.value.playerDamage >= 20)
  ) {
    return "battle-layout--critical";
  }

  if (lastOutcome.value.playerDamage > 0 || lastOutcome.value.enemyDamage > 0) {
    return "battle-layout--impact";
  }

  return null;
});

// 播报条用于快速概括这一回合最重要的变化。
const battleAnnouncer = computed(() => {
  if (!shouldShowBattleAnnouncer.value) {
    return null;
  }

  if (battleStore.status === "victory") {
    return {
      key: `victory-${battleStore.turn}`,
      title: "试炼突破",
      body: "怪物已经被彻底击溃，战利品和成长奖励正在结算。",
      badge: battleStore.battleResult?.rank ? `评级 ${battleStore.battleResult.rank}` : null,
      tone: "victory",
    };
  }

  if (battleStore.status === "defeat") {
    return {
      key: `defeat-${battleStore.turn}`,
      title: "阵线失守",
      body: "这一回合没能稳住节奏，你将退回营地重新整备。",
      badge: "需要重整",
      tone: "danger",
    };
  }

  if (!lastOutcome.value) {
    if (battleStore.activeBossEffects.length > 0) {
      return {
        key: `boss-lock-${battleStore.turn}`,
        title: "首领压制仍在持续",
        body: "下一回合限制已经生效，先看清状态再决定出手方式。",
        badge: `${battleStore.activeBossEffects.length} 个效果`,
        tone: "boss",
      };
    }

    return null;
  }

  if (lastOutcome.value.action === "guard" && lastOutcome.value.correct) {
    return {
      key: `guard-${battleStore.turn}`,
      title: "稳固格挡",
      body: `你成功压低了反击伤害，本回合仅承受 ${lastOutcome.value.enemyDamage} 点冲击。`,
      badge: "防御成功",
      tone: "guard",
    };
  }

  if (lastOutcome.value.playerDamage > 0 && lastOutcome.value.action === "skill") {
    return {
      key: `critical-${battleStore.turn}`,
      title: "技能命中",
      body: `Vue 爆发正中目标，造成 ${lastOutcome.value.playerDamage} 点高额伤害。`,
      badge: "高爆发",
      tone: "critical",
    };
  }

  if (lastOutcome.value.playerDamage > 0) {
    return {
      key: `hit-${battleStore.turn}`,
      title: "攻击命中",
      body: `这次出招成功命中敌人，造成 ${lastOutcome.value.playerDamage} 点伤害。`,
      badge: "稳定推进",
      tone: "impact",
    };
  }

  if (lastOutcome.value.enemyDamage > 0) {
    return {
      key: `counter-${battleStore.turn}`,
      title: "遭到反击",
      body: `敌人完成反打，你本回合承受了 ${lastOutcome.value.enemyDamage} 点伤害。`,
      badge: "注意血线",
      tone: "danger",
    };
  }

  return null;
});

// 玩家受击、格挡和战败都会映射成不同的卡片状态。
const playerCardStateClass = computed(() => {
  if (battleStore.status === "defeat") {
    return "combatant-card--down";
  }

  if (!shouldShowBattleEffects.value) {
    return null;
  }

  if (!lastOutcome.value) {
    return null;
  }

  if (lastOutcome.value.action === "guard" && lastOutcome.value.correct) {
    return "combatant-card--guarded";
  }

  if (lastOutcome.value.enemyDamage > 0) {
    return "combatant-card--hit";
  }

  return null;
});

// 敌人会根据命中、暴击和倒下状态切换不同表现。
const enemyCardStateClass = computed(() => {
  if (battleStore.status === "victory") {
    return "combatant-card--down";
  }

  if (!shouldShowBattleEffects.value) {
    return null;
  }

  if (!lastOutcome.value) {
    return null;
  }

  if (
    lastOutcome.value.playerDamage > 0 &&
    (lastOutcome.value.action === "skill" || lastOutcome.value.playerDamage >= 20)
  ) {
    return "combatant-card--critical";
  }

  if (lastOutcome.value.playerDamage > 0) {
    return "combatant-card--hit";
  }

  return null;
});

// 浮动伤害标记让本回合的数值变化更直观。
const playerImpactBadge = computed(() => {
  if (!shouldShowBattleEffects.value) {
    return null;
  }

  if (!lastOutcome.value) {
    return null;
  }

  if (battleStore.status === "defeat" && lastOutcome.value.enemyDamage > 0) {
    return {
      key: `player-${battleStore.turn}-down`,
      value: `-${lastOutcome.value.enemyDamage}`,
      caption: "濒危",
      tone: "danger",
    };
  }

  if (lastOutcome.value.action === "guard" && lastOutcome.value.correct) {
    return {
      key: `player-${battleStore.turn}-guard`,
      value: "格挡",
      caption: "减伤成功",
      tone: "guard",
    };
  }

  if (lastOutcome.value.enemyDamage > 0) {
    return {
      key: `player-${battleStore.turn}-${lastOutcome.value.enemyDamage}`,
      value: `-${lastOutcome.value.enemyDamage}`,
      caption: "受击",
      tone: "danger",
    };
  }

  return null;
});

const enemyImpactBadge = computed(() => {
  if (!shouldShowBattleEffects.value) {
    return null;
  }

  if (!lastOutcome.value || !enemy.value) {
    return null;
  }

  if (battleStore.status === "victory" && lastOutcome.value.playerDamage > 0) {
    return {
      key: `enemy-${battleStore.turn}-finish`,
      value: "终结",
      caption: `-${lastOutcome.value.playerDamage}`,
      tone: "victory",
    };
  }

  if (lastOutcome.value.playerDamage > 0) {
    const isCritical =
      lastOutcome.value.action === "skill" || lastOutcome.value.playerDamage >= 20;

    return {
      key: `enemy-${battleStore.turn}-${lastOutcome.value.playerDamage}`,
      value: `-${lastOutcome.value.playerDamage}`,
      caption: isCritical ? "暴击" : "命中",
      tone: isCritical ? "critical" : "hit",
    };
  }

  return null;
});

// 状态短句会概括本回合双方发生的核心事件。
const playerStatusLine = computed(() => {
  if (battleStore.status === "defeat") {
    return "这一击把你逼回了营地。";
  }

  if (!lastOutcome.value) {
    return "等待本回合裁定。";
  }

  if (lastOutcome.value.action === "guard" && lastOutcome.value.correct) {
    return "你稳住了阵脚，成功挡下了大部分冲击。";
  }

  if (lastOutcome.value.enemyDamage > 0) {
    return `本回合承受 ${lastOutcome.value.enemyDamage} 点伤害。`;
  }

  return "这一回合没有受到有效伤害。";
});

const enemyStatusLine = computed(() => {
  if (battleStore.status === "victory") {
    return "这只怪物已经被彻底击溃。";
  }

  if (!lastOutcome.value) {
    return "正在等待你的下一次出招。";
  }

  if (lastOutcome.value.playerDamage > 0) {
    if (lastOutcome.value.action === "skill") {
      return `Vue 爆发造成了 ${lastOutcome.value.playerDamage} 点重创。`;
    }

    return `本回合受到 ${lastOutcome.value.playerDamage} 点伤害。`;
  }

  return "这一回合没有被有效命中。";
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
