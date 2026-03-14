<template>
  <article
    class="panel chapter-card"
    :class="[`chapter-card--${chapter.accent}`, { 'chapter-card--locked': !unlocked }]"
  >
    <div class="panel__eyebrow">
      Chapter {{ chapter.id }}
      <span class="chapter-card__status">
        {{ unlocked ? (cleared ? "Cleared" : "Unlocked") : "Locked" }}
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
      Progress: {{ progress.cleared }} / {{ progress.total }}
    </div>

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
          {{ clearedEnemies.includes(enemy.id) ? "Practice again" : enemy.role }}
        </small>
      </button>
    </div>
  </article>
</template>

<script setup>
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

defineEmits(["challenge"]);
</script>
