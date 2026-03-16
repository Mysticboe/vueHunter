<template>
  <article
    class="panel chapter-card"
    :class="[`chapter-card--${chapter.accent}`, { 'chapter-card--locked': !unlocked }]"
  >
    <div class="panel__eyebrow">
      第 {{ chapter.id }} 章
      <span class="chapter-card__status">
        {{ unlocked ? (cleared ? "已通关" : "已解锁") : "未解锁" }}
      </span>
    </div>
    <h2 class="panel__title">{{ chapter.title }}</h2>
    <p class="chapter-card__subtitle">{{ chapter.subtitle }}</p>
    <p class="chapter-card__story">{{ chapter.storyBeat }}</p>

    <div class="tag-row">
      <span
        v-for="point in chapter.knowledgePoints"
        :key="point"
        class="chip"
      >
        {{ point }}
      </span>
    </div>

    <div class="chapter-card__progress">
      进度：{{ progress.cleared }} / {{ progress.total }}
    </div>

    <!-- 遭遇按钮完全来自数据层，章节扩展时不用改模板结构。 -->
    <div class="chapter-card__encounters">
      <button
        v-for="enemy in enemies"
        :key="enemy.id"
        type="button"
        class="encounter-button"
        :disabled="!unlocked"
        @click="$emit('challenge', enemy.id)"
      >
        <span>{{ enemy.name }}</span>
        <small>
          {{ clearedEnemies.includes(enemy.id) ? "再次练习" : enemy.role === "Boss" ? "首领" : enemy.role }}
        </small>
      </button>
    </div>
  </article>
</template>

<script setup>
// 地图页会把章节状态预先算好，这个组件只负责展示。
defineProps({
  chapter: {
    type: Object,
    required: true,
  },
  enemies: {
    type: Array,
    default: () => [],
  },
  unlocked: {
    type: Boolean,
    default: false,
  },
  cleared: {
    type: Boolean,
    default: false,
  },
  progress: {
    type: Object,
    default: () => ({ cleared: 0, total: 0 }),
  },
  clearedEnemies: {
    type: Array,
    default: () => [],
  },
});

// 点击遭遇按钮后，由父组件决定跳转到哪场战斗。
defineEmits(["challenge"]);
</script>
