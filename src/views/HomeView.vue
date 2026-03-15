<template>
  <main class="page-shell home-view">
    <section class="hero panel hero-panel">
      <div class="panel__eyebrow">Vue Hunter</div>
      <h1 class="hero__title">把 Vue3 学习做成一场 RPG 试炼。</h1>
      <p class="hero__body">
        在战斗里答题，在成长里掌握 Vue3。每一次出招、升级、解锁新区域，
        都是在推进你的前端勇者之路。
      </p>

      <div class="hero__actions">
        <button
          type="button"
          class="button button--primary"
          @click="handleNewGame"
        >
          开始新游戏
        </button>
        <button
          type="button"
          class="button button--ghost"
          :disabled="!gameStore.hasProgress"
          @click="handleContinue"
        >
          继续游戏
        </button>
        <button
          type="button"
          class="button button--ghost"
          @click="router.push('/settings')"
        >
          设置
        </button>
      </div>

      <!-- 首页数据卡帮助玩家快速了解当前版本内容范围。 -->
      <div class="hero__stats">
        <div class="hero-stat">
          <span class="hero-stat__label">当前版本</span>
          <strong>{{ buildLabel }}</strong>
        </div>
        <div class="hero-stat">
          <span class="hero-stat__label">可玩章节</span>
          <strong>{{ chapterCount }}</strong>
        </div>
        <div class="hero-stat">
          <span class="hero-stat__label">题型数量</span>
          <strong>3 种战斗题型</strong>
        </div>
      </div>
    </section>

    <!-- 功能卡片概览当前 MVP 已经支持的核心循环。 -->
    <section class="feature-grid">
      <article class="panel feature-card">
        <div class="panel__eyebrow">循环</div>
        <h2 class="panel__title">地图 -> 战斗 -> 奖励</h2>
        <p>
          当前主流程已经打通：选章节、打题目战斗、拿奖励、继续成长。
        </p>
      </article>

      <article class="panel feature-card">
        <div class="panel__eyebrow">学习</div>
        <h2 class="panel__title">错题会留下来继续训练</h2>
        <p>
          所有答错题都会记录进存档，后续可以在图鉴和练习模式里继续复盘。
        </p>
      </article>

      <article class="panel feature-card">
        <div class="panel__eyebrow">首领</div>
        <h2 class="panel__title">首领战已经支持阶段变化</h2>
        <p>
          后期首领会在战斗中途进入新阶段、改变攻击意图，节奏也会和普通战不同。
        </p>
      </article>
    </section>

    <!-- 有进度时直接在首页展示当前任务看板。 -->
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

// 首页承担新开局和继续游戏的入口职责。
const router = useRouter();
const gameStore = useGameStore();
// 章节数和版本标识都从数据层动态推导。
const chapterCount = computed(() => chapters.length);
const buildLabel = computed(() => {
  const numerals = ["I", "II", "III", "IV", "V", "VI", "VII"];
  return `内测 ${numerals[Math.max(0, chapterCount.value - 1)] ?? chapterCount.value}`;
});

// 新游戏会重置整局状态并立即进入地图。
function handleNewGame() {
  gameStore.startNewGame();
  router.push("/map");
}

// 只有存在有效进度时才允许继续游戏。
function handleContinue() {
  if (!gameStore.hasProgress) {
    return;
  }

  router.push("/map");
}
</script>
