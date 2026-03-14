<template>
  <section class="panel quest-board">
    <div class="panel__eyebrow">任务看板</div>
    <!-- 标题卡直接告诉玩家当前这局的最高优先级目标。 -->
    <div class="quest-board__hero">
      <div>
        <h2 class="panel__title">{{ gameStore.activeQuest.title }}</h2>
        <p class="muted-copy">{{ gameStore.activeQuest.description }}</p>
      </div>
      <span class="chip">{{ gameStore.activeQuest.progressLabel }}</span>
    </div>

    <!-- 任务拆解卡帮助玩家快速知道下一步该做什么。 -->
    <div class="quest-board__grid">
      <article
        v-for="entry in gameStore.questChecklist"
        :key="entry.title"
        class="quest-board__card"
      >
        <strong>{{ entry.title }}</strong>
        <p>{{ entry.body }}</p>
      </article>
    </div>
  </section>
</template>

<script setup>
import { useGameStore } from "../../stores/game";

// 看板内容全是派生状态，所以直接从主状态仓库读取即可。
const gameStore = useGameStore();
</script>
