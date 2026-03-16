<template>
  <section class="panel question-panel">
    <div class="panel__eyebrow">试炼题目</div>
    <div class="question-panel__header">
      <h2 class="panel__title">第 {{ turn }} 回合</h2>
      <div class="question-panel__chips">
        <span class="chip">行动：{{ actionLabel }}</span>
        <span
          v-if="question"
          class="chip"
        >
          题型：{{ questionTypeLabel }}
        </span>
        <span
          v-if="comboStreak > 0"
          class="chip"
        >
          连击：x{{ comboStreak }}
        </span>
      </div>
    </div>

    <!-- 行动按钮决定答对之后转化成哪种战斗效果。 -->
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

    <!-- 战术预警把敌方下一次反击的技能、威胁和承伤预估提前告诉玩家。 -->
    <div
      v-if="enemyPreview"
      class="question-forecast"
    >
      <article
        class="forecast-card"
        :class="`forecast-card--${enemyPreview.threatTone}`"
      >
        <span class="forecast-card__label">敌方技能</span>
        <strong>{{ enemyPreview.skillName }}</strong>
        <small>{{ enemyPreview.intent }}</small>
      </article>
      <article
        class="forecast-card"
        :class="`forecast-card--${enemyPreview.threatTone}`"
      >
        <span class="forecast-card__label">威胁等级</span>
        <strong>{{ enemyPreview.threatLabel }}</strong>
        <small>{{ threatDescription }}</small>
      </article>
      <article class="forecast-card">
        <span class="forecast-card__label">预计承伤</span>
        <strong>{{ forecastDamageLabel }}</strong>
        <small>{{ actionForecastHint }}</small>
      </article>
    </div>

    <!-- 首领附加效果会在下一回合生效，这里直接提醒玩家当前限制。 -->
    <div
      v-if="activeEffects.length > 0"
      class="question-panel__chips"
    >
      <span
        v-for="effect in activeEffects"
        :key="effect.id"
        class="chip"
        :class="`chip--${effect.tone}`"
      >
        {{ effect.label }}：{{ effect.detail }}
      </span>
    </div>

    <!-- 题目主体同时支持普通选项题和代码片段题。 -->
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

    <!-- 本回合结果会保留到玩家主动进入下一回合。 -->
    <div
      v-if="lastOutcome"
      class="result-card"
      :class="{
        'result-card--success': lastOutcome.correct,
        'result-card--danger': !lastOutcome.correct,
      }"
    >
      <div class="result-card__title">
        {{ lastOutcome.correct ? "回答正确" : "回答错误" }}
      </div>
      <div class="question-panel__chips result-card__chips">
        <span
          v-if="lastOutcome.comboStreak > 0"
          class="chip"
        >
          当前连击：x{{ lastOutcome.comboStreak }}
        </span>
        <span
          v-if="lastOutcome.enemySkillName"
          class="chip"
        >
          敌方技能：{{ lastOutcome.enemySkillName }}
        </span>
        <span
          v-if="lastOutcome.enemyThreatLabel"
          class="chip"
          :class="`chip--${lastOutcome.enemyThreatTone ?? 'mid'}`"
        >
          威胁：{{ lastOutcome.enemyThreatLabel }}
        </span>
      </div>
      <p>{{ lastOutcome.effectLine }}</p>
      <p>
        玩家伤害：{{ lastOutcome.playerDamage }}
        <span v-if="lastOutcome.enemyDamage > 0">
          | 敌人伤害：{{ lastOutcome.enemyDamage }}
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
      下一回合
    </button>
  </section>
</template>

<script setup>
import { computed } from "vue";

// 这里的传入参数与临时战斗状态一一对应，组件本身保持无状态。
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
  comboStreak: {
    type: Number,
    default: 0,
  },
  enemyPreview: {
    type: Object,
    default: null,
  },
  activeEffects: {
    type: Array,
    default: () => [],
  },
  lastOutcome: {
    type: Object,
    default: null,
  },
});

// 具体战斗变更由父组件处理，这里只向外抛出玩家意图。
defineEmits(["select-action", "answer", "next-turn"]);

// 行动列表通过计算属性生成，方便实时反映 MP 是否足够。
const actionOptions = computed(() => [
  {
    value: "attack",
    label: "普通攻击",
    description: "答对后造成稳定伤害。",
    disabled: false,
  },
  {
    value: "skill",
    label: "Vue 爆发",
    description: props.canUseSkill
      ? "消耗 10 MP 造成更高伤害。"
      : "需要 10 MP 才能施放。",
    disabled: !props.canUseSkill,
  },
  {
    value: "guard",
    label: "调试防御",
    description: "减少下一次反击伤害。",
    disabled: false,
  },
]);

// 读取当前选中的行动名称，直接展示在题目头部。
const actionLabel = computed(() => {
  return (
    actionOptions.value.find((option) => option.value === props.selectedAction)
      ?.label ?? "普通攻击"
  );
});

// 把内部题型值转换成界面可读标签。
const questionTypeLabel = computed(() => {
  if (props.question?.type === "judge") {
    return "判断题";
  }

  if (props.question?.type === "code") {
    return "代码补全";
  }

  return "单选题";
});

// 各种题型都统一从这里读取可选答案列表。
const answerOptions = computed(() => props.question?.options ?? []);

// 威胁描述会随着敌方技能强度变化，帮助玩家更快判断风险。
const threatDescription = computed(() => {
  if (!props.enemyPreview) {
    return "本回合暂无敌方预警。";
  }

  if (props.enemyPreview.threatTone === "critical") {
    return "这一击非常危险，尽量不要硬吃。";
  }

  if (props.enemyPreview.threatTone === "high") {
    return "这轮反击很重，谨慎选择全力输出。";
  }

  if (props.enemyPreview.threatTone === "mid") {
    return "威胁中等，答题稳定比硬拼更重要。";
  }

  return "这次反击压力较低，可以更主动地争取输出。";
});

// 预计承伤会根据当前行动即时变化，方便比较输出与防御收益。
const forecastDamageLabel = computed(() => {
  if (!props.enemyPreview) {
    return "暂无";
  }

  if (props.selectedAction === "guard") {
    return `答对约 ${props.enemyPreview.guardedDamage} / 答错约 ${props.enemyPreview.failedGuardDamage}`;
  }

  return `约 ${props.enemyPreview.rawDamage}`;
});

// 不同行动的提示文案不同，尽量把策略差异说清楚。
const actionForecastHint = computed(() => {
  if (!props.enemyPreview) {
    return "等待下一次遭遇。";
  }

  if (props.selectedAction === "guard") {
    return props.question?.type === "judge"
      ? "这道判断题适合稳扎稳打，防御收益会更高。"
      : "如果答对，调试防御能明显压低本次反击。";
  }

  if (props.selectedAction === "skill") {
    return "你会打出更高伤害，但也要准备承受完整反击。";
  }

  return "这是最稳的输出选项，若想保命可以改成调试防御。";
});
</script>
