<template>
  <div class="stat-bar">
    <!-- Label row keeps the raw number visible even when the bar is nearly empty. -->
    <div class="stat-bar__label-row">
      <span>{{ label }}</span>
      <span>{{ value }} / {{ max }}</span>
    </div>
    <div class="stat-bar__track">
      <div
        class="stat-bar__fill"
        :class="`stat-bar__fill--${tone}`"
        :style="{ width: `${fillWidth}%` }"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

// The stat bar is generic so battle, map, and inventory can all reuse it.
const props = defineProps({
  label: {
    type: String,
    required: true,
  },
  value: {
    type: Number,
    required: true,
  },
  max: {
    type: Number,
    required: true,
  },
  tone: {
    type: String,
    default: "hp",
  },
});

// Clamp percentage math to avoid negative widths or values over 100%.
const fillWidth = computed(() => {
  if (props.max <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (props.value / props.max) * 100));
});
</script>
