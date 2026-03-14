<template>
  <section class="panel question-panel">
    <div class="panel__eyebrow">Trial Prompt</div>
    <div class="question-panel__header">
      <h2 class="panel__title">Turn {{ turn }}</h2>
      <div class="question-panel__chips">
        <span class="chip">Action: {{ actionLabel }}</span>
        <span
          v-if="question"
          class="chip"
        >
          Type: {{ questionTypeLabel }}
        </span>
      </div>
    </div>

    <!-- Action chips let the player translate a correct answer into a combat style. -->
    <div class="action-strip">
      <button
        v-for="action in actionOptions"
        :key="action.value"
        type="button"
        class="action-chip"
        :class="{ 'action-chip--active': selectedAction === action.value }"
        :disabled="action.disabled || status !== 'in_progress'"
        @click="$emit('select-action', action.value)"
      >
        <span>{{ action.label }}</span>
        <small>{{ action.description }}</small>
      </button>
    </div>

    <!-- The question body supports standard options and optional code snippets. -->
    <div
      v-if="question"
      class="question-card"
    >
      <p class="question-card__prompt">{{ question.prompt }}</p>
      <pre
        v-if="question.type === 'code'"
        class="question-card__code"
      ><code>{{ question.snippet }}</code></pre>
      <div class="question-card__options">
        <button
          v-for="option in answerOptions"
          :key="option"
          type="button"
          class="answer-button"
          :disabled="status !== 'in_progress'"
          @click="$emit('answer', option)"
        >
          {{ option }}
        </button>
      </div>
    </div>

    <!-- Outcome feedback stays on-screen until the player manually advances the turn. -->
    <div
      v-if="lastOutcome"
      class="result-card"
      :class="{
        'result-card--success': lastOutcome.correct,
        'result-card--danger': !lastOutcome.correct,
      }"
    >
      <div class="result-card__title">
        {{ lastOutcome.correct ? "Correct answer" : "Missed answer" }}
      </div>
      <p>{{ lastOutcome.effectLine }}</p>
      <p>
        Player damage: {{ lastOutcome.playerDamage }}
        <span v-if="lastOutcome.enemyDamage > 0">
          | Enemy damage: {{ lastOutcome.enemyDamage }}
        </span>
      </p>
      <p class="result-card__explanation">{{ lastOutcome.explanation }}</p>
    </div>

    <button
      v-if="status === 'resolved'"
      type="button"
      class="button button--primary"
      @click="$emit('next-turn')"
    >
      Next turn
    </button>
  </section>
</template>

<script setup>
import { computed } from "vue";

// Props mirror the temporary battle store and keep the panel stateless.
const props = defineProps({
  question: {
    type: Object,
    default: null,
  },
  selectedAction: {
    type: String,
    default: "attack",
  },
  canUseSkill: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    default: "idle",
  },
  turn: {
    type: Number,
    default: 1,
  },
  lastOutcome: {
    type: Object,
    default: null,
  },
});

// The parent view handles all battle mutations; this panel only emits intent.
defineEmits(["select-action", "answer", "next-turn"]);

// The action list is computed so the skill button can reflect live MP availability.
const actionOptions = computed(() => [
  {
    value: "attack",
    label: "Basic Strike",
    description: "Safe damage when the answer is right.",
    disabled: false,
  },
  {
    value: "skill",
    label: "Vue Burst",
    description: props.canUseSkill
      ? "Spend 10 MP for a stronger hit."
      : "Need 10 MP to cast.",
    disabled: !props.canUseSkill,
  },
  {
    value: "guard",
    label: "Debug Guard",
    description: "Reduce the next counterattack.",
    disabled: false,
  },
]);

// Show the readable label for the currently selected action chip.
const actionLabel = computed(() => {
  return (
    actionOptions.value.find((option) => option.value === props.selectedAction)
      ?.label ?? "Basic Strike"
  );
});

// Translate internal question types into UI labels.
const questionTypeLabel = computed(() => {
  if (props.question?.type === "judge") {
    return "Judge";
  }

  if (props.question?.type === "code") {
    return "Code Fill";
  }

  return "Single Choice";
});

// Options may change per prompt type, so expose them through one computed source.
const answerOptions = computed(() => props.question?.options ?? []);
</script>
