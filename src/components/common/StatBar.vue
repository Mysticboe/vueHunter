<template>
  <div class="stat-bar">
    <!-- 进度条几乎为空时，也能通过数字读出准确值。 -->
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

// 这个状态条做成通用组件，战斗、地图、背包都能复用。
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

// 对宽度百分比做夹取，避免出现负值或超过 100%。
const fillWidth = computed(() => {
  if (props.max <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (props.value / props.max) * 100));
});
</script>
