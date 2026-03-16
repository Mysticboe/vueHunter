<template>
  <section class="panel battle-log">
    <div class="panel__eyebrow">战斗记录</div>
    <h3 class="panel__title">回合历史</h3>
    <!-- 保留最近几条事件，方便玩家回看本回合发生了什么。 -->
    <ul class="battle-log__list">
      <li
        v-for="(entry, index) in entries"
        :key="`${entry}-${index}`"
      >
        {{ entry }}
      </li>
    </ul>
  </section>
</template>

<script setup>
// 日志文案已经在上层整理好，这里只负责渲染。
defineProps({
  entries: {
    type: Array,
    default: () => [],
  },
});
</script>
