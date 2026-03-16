<template>
  <main class="page-shell utility-view">
    <header class="panel utility-header">
      <div>
        <div class="panel__eyebrow">图鉴</div>
        <h1 class="panel__title">查看怪物档案、章节知识点和错题记录。</h1>
      </div>
      <div class="page-links">
        <button
          type="button"
          class="button button--ghost"
          @click="router.push('/map')"
        >
          地图
        </button>
        <button
          type="button"
          class="button button--ghost"
          @click="router.push('/inventory')"
        >
          背包
        </button>
        <button
          type="button"
          class="button button--ghost"
          @click="router.push('/skills')"
        >
          技能树
        </button>
        <button
          type="button"
          class="button button--ghost"
          :disabled="!hasWrongQuestions"
          @click="openPractice({ filter: 'all' })"
        >
          复盘
        </button>
      </div>
    </header>

    <section class="utility-grid">
      <!-- 怪物图鉴只会展示已经遇到过的敌人。 -->
      <section class="panel panel--wide">
        <div class="panel__eyebrow">怪物图鉴</div>
        <h2 class="panel__title">已遭遇的敌人</h2>
        <div class="card-list">
          <article
            v-for="enemy in codexEntries"
            :key="enemy.id"
            class="list-card"
            :class="{ 'list-card--locked': !enemy.encountered }"
          >
            <div>
              <strong>{{ enemy.encountered ? enemy.name : "未知敌人" }}</strong>
              <p>
                {{ enemy.encountered ? `第 ${enemy.chapterId} 章的${enemy.displayRole}` : "在战斗中遇见它之后，这里的信息才会解锁。" }}
              </p>
              <small v-if="enemy.encountered">
                奖励：{{ enemy.rewardExp }} 经验 / {{ enemy.rewardGold }} 金币
              </small>
            </div>
          </article>
        </div>
      </section>

      <!-- 里程碑给玩家提供主线之外的长期目标。 -->
      <section class="panel panel--wide">
        <div class="panel__eyebrow">里程碑</div>
        <h2 class="panel__title">长期成长记录</h2>
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

      <!-- 知识图谱既展示章节知识点，也可以直接发起章节训练。 -->
      <section class="panel">
        <div class="panel__eyebrow">知识图谱</div>
        <h2 class="panel__title">章节标签</h2>
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
                训练本章
              </button>
            </div>
          </article>
        </div>
      </section>

      <!-- 错题本是进入专项复盘练习的直接入口。 -->
      <section class="panel panel--wide">
        <div class="panel__eyebrow">错题本</div>
        <div class="utility-header utility-header--compact">
          <h2 class="panel__title">可继续练习的错题</h2>
          <div class="page-links">
            <button
              type="button"
              class="button button--primary"
              :disabled="filteredWrongQuestions.length === 0"
              @click="openPractice({ filter: activeFilter })"
            >
              {{ activeFilter === "all" ? "练习当前错题" : `练习第 ${activeFilter} 章` }}
            </button>
            <button
              type="button"
              class="button button--ghost"
              :disabled="!hasWrongQuestions || activeFilter === 'all'"
              @click="openPractice({ filter: 'all' })"
            >
              全部练习
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
            <strong>Q{{ entry.id }} | 第 {{ entry.chapterId }} 章</strong>
            <p>{{ entry.prompt }}</p>
            <small>答案：{{ entry.answer }} | 答错 {{ entry.count }} 次</small>
            <p class="muted-copy">{{ entry.explanation }}</p>
          </article>
        </div>
        <p
          v-else
          class="muted-copy"
        >
          这个筛选条件下暂时没有错题记录。
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

// 图鉴页聚合了怪物档案、里程碑、知识点和错题复盘。
const router = useRouter();
const gameStore = useGameStore();
const activeFilter = ref("all");
// 没有错题时，相关复盘按钮会自动禁用。
const hasWrongQuestions = computed(() => gameStore.player.wrongQuestions.length > 0);

// 章节筛选器同时服务于错题本和练习入口。
const filters = [
  { label: "全部", value: "all" },
  ...chapters.map((chapter) => ({
    label: `第 ${chapter.id} 章`,
    value: chapter.id,
  })),
];

// 给敌人补上是否已遭遇状态，便于渲染图鉴解锁效果。
const codexEntries = computed(() =>
  enemies.map((enemy) => ({
    ...enemy,
    encountered: gameStore.encounteredEnemies.includes(enemy.id),
    displayRole: enemy.role === "Boss" ? "首领" : enemy.role,
  })),
);

// 只做筛选，不改动错题本原本的存储顺序。
const filteredWrongQuestions = computed(() => {
  if (activeFilter.value === "all") {
    return gameStore.player.wrongQuestions;
  }

  return gameStore.player.wrongQuestions.filter(
    (entry) => entry.chapterId === activeFilter.value,
  );
});

// 练习入口同时支持错题复盘和章节训练两种模式。
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
