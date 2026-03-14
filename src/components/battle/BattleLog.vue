<template>
  <section class="panel battle-log">
    <div class="panel__eyebrow">Battle Log</div>
    <h3 class="panel__title">Turn History</h3>
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
defineProps({
  entries: {
    type: Array,
    default: () => [],
  },
});
</script>

