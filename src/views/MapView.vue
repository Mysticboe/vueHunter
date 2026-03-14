<template>
  <main class="page-shell map-view">
    <header class="hud-bar panel">
      <div>
        <div class="panel__eyebrow">世界地图</div>
        <h1 class="panel__title">新的试炼已经准备就绪。</h1>
      </div>

      <div class="hud-stats">
        <div class="hud-stat">
          <span>HP / MP</span>
          <strong>{{ gameStore.player.hp }} / {{ gameStore.player.mp }}</strong>
        </div>
        <div class="hud-stat">
          <span>等级</span>
          <strong>{{ gameStore.player.level }}</strong>
        </div>
        <div class="hud-stat">
          <span>经验</span>
          <strong>
            {{ gameStore.player.exp }}
            <template v-if="gameStore.nextLevelExp">
              / {{ gameStore.nextLevelExp }}
            </template>
          </strong>
        </div>
        <div class="hud-stat">
          <span>金币</span>
          <strong>{{ gameStore.player.gold }}</strong>
        </div>
        <div class="hud-stat">
          <span>技能点</span>
          <strong>{{ gameStore.player.skillPoints }}</strong>
        </div>
      </div>
    </header>

    <section
      v-if="!gameStore.hasProgress"
      class="panel empty-panel"
    >
      <div class="panel__eyebrow">未加载存档</div>
      <h2 class="panel__title">先开始一局游戏，地图才会展开。</h2>
      <button
        type="button"
        class="button button--primary"
        @click="startFreshRun"
      >
        创建新存档
      </button>
    </section>

    <section
      v-else
      class="map-layout"
    >
      <!-- 左侧是推进主线：任务看板加章节卡片。 -->
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

      <!-- 右侧是城镇管理：属性、复盘和功能入口。 -->
      <aside class="map-sidebar">
        <section class="panel sidebar-card">
          <div class="panel__eyebrow">勇者面板</div>
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
              <span>攻击</span>
              <strong>{{ gameStore.player.attack }}</strong>
            </div>
            <div>
              <span>防御</span>
              <strong>{{ gameStore.player.defense }}</strong>
            </div>
          </div>
          <div class="stack-actions">
            <button
              type="button"
              class="button button--ghost"
              @click="restAtCamp"
            >
              营地休息（14 金币）
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
          <div class="panel__eyebrow">复盘板</div>
          <h2 class="panel__title">最近答错的题目</h2>
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
              <small>答错 {{ entry.count }} 次</small>
            </li>
          </ul>
          <button
            v-if="gameStore.recentWrongQuestions.length > 0"
            type="button"
            class="button button--ghost"
            @click="router.push('/practice')"
          >
            进入错题练习
          </button>
          <p
          v-else
          class="muted-copy"
        >
          暂时还没有错题，当前记录很干净。
        </p>
      </section>

      <section class="panel sidebar-card">
          <div class="panel__eyebrow">城镇菜单</div>
          <h2 class="panel__title">整理当前这一局</h2>
          <div class="stack-actions">
            <button
              type="button"
              class="button button--ghost"
              @click="router.push('/inventory')"
            >
              打开背包
            </button>
            <button
              type="button"
              class="button button--ghost"
              @click="router.push('/skills')"
            >
              打开技能树
            </button>
            <button
              type="button"
              class="button button--ghost"
              @click="router.push('/handbook')"
            >
              打开图鉴
            </button>
            <button
              type="button"
              class="button button--ghost"
              @click="openChapterDrill"
            >
              章节训练
            </button>
            <button
              type="button"
              class="button button--ghost"
              @click="router.push('/')"
            >
              返回首页
            </button>
            <button
              type="button"
              class="button button--ghost"
              @click="resetRun"
            >
              重置存档
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

// 地图页是单机流程里的主中枢。
const router = useRouter();
const gameStore = useGameStore();
const campMessage = ref("");

// 把静态章节资料和实时进度合并成直接可渲染的数据。
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

// 推荐训练章节优先取当前主线目标，否则回退到最近解锁章节。
const recommendedDrillChapterId = computed(() => {
  const targetChapterId = gameStore.nextTargetChapter?.id;

  if (gameStore.player.unlockedChapters.includes(targetChapterId)) {
    return targetChapterId;
  }

  return gameStore.player.unlockedChapters.at(-1) ?? 1;
});

// 新开局会直接生成进度并进入地图。
function startFreshRun() {
  gameStore.startNewGame();
}

// 遭遇战通过路由参数驱动，这里只要带上敌人 id。
function startBattle(enemyId) {
  router.push(`/battle/${enemyId}`);
}

// 章节训练通过 query 参数决定模式和章节。
function openChapterDrill() {
  router.push({
    path: "/practice",
    query: {
      mode: "drill",
      chapter: String(recommendedDrillChapterId.value),
    },
  });
}

// 重置存档后回到首页重新开始。
function resetRun() {
  gameStore.resetGame();
  router.push("/");
}

// 营地休息也放在地图页，方便战斗间快速补满。
function restAtCamp() {
  const rested = gameStore.restAtCamp();

  campMessage.value = rested
    ? "状态已经恢复，继续出发吧。"
    : "金币不足 14，暂时不能休息。";
}
</script>
