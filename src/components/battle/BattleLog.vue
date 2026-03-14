<template>
  <section class="panel battle-log">
    <div class="panel__eyebrow">Battle Log</div>
    <h3 class="panel__title">Turn History</h3>
    <!-- Keep recent events visible so players can read how a turn resolved. -->
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
// The log is already formatted upstream, so this component only renders it.
defineProps({
  entries: {
    type: Array,
    default: () => [],
  },
});
</script>
