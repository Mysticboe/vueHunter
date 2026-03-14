<template>
  <main class="page-shell utility-view">
    <header class="panel utility-header">
      <div>
        <div class="panel__eyebrow">练习大厅</div>
        <h1 class="panel__title">{{ pageTitle }}</h1>
      </div>
      <div class="page-links">
        <button
          type="button"
          class="button button--ghost"
          @click="router.push('/handbook')"
        >
          图鉴
        </button>
        <button
          type="button"
          class="button button--ghost"
          @click="router.push('/map')"
        >
          地图
        </button>
      </div>
    </header>

    <section class="utility-grid">
      <!-- 左侧控制练习模式、章节目标和实时统计。 -->
      <section class="panel">
        <div class="panel__eyebrow">练习信息</div>
        <h2 class="panel__title">{{ sessionTitle }}</h2>
        <div class="summary-grid practice-summary">
          <div>
            <span>模式</span>
            <strong>{{ practiceModeLabel }}</strong>
          </div>
          <div>
            <span>目标</span>
            <strong>{{ targetLabel }}</strong>
          </div>
          <div>
            <span>正确率</span>
            <strong>{{ accuracyLabel }}</strong>
          </div>
          <div>
            <span>已清除</span>
            <strong>{{ sessionStats.resolvedBacklog }}</strong>
          </div>
          <div>
            <span>错误</span>
            <strong>{{ sessionStats.missed }}</strong>
          </div>
          <div>
            <span>最高连击</span>
            <strong>x{{ sessionStats.bestStreak }}</strong>
          </div>
        </div>

        <div class="practice-mode-strip">
          <button
            type="button"
            class="button"
            :class="practiceMode === 'review' ? 'button--primary' : 'button--ghost'"
            @click="setMode('review')"
          >
            错题复盘
          </button>
          <button
            type="button"
            class="button"
            :class="practiceMode === 'drill' ? 'button--primary' : 'button--ghost'"
            @click="setMode('drill')"
          >
            章节训练
          </button>
        </div>

        <div class="question-panel__chips">
          <button
            v-for="filter in activeFilters"
            :key="filter.value"
            type="button"
            class="button"
            :class="currentFilterValue === filter.value ? 'button--primary' : 'button--ghost'"
            :disabled="filter.disabled"
            @click="applyFilter(filter.value)"
          >
            {{ filter.label }} ({{ filter.count }})
          </button>
        </div>

        <p class="muted-copy practice-copy">
          {{ practiceDescription }}
        </p>
      </section>

      <!-- 右侧区域会在当前题目、结算报告和空状态之间切换。 -->
      <section class="panel panel--wide practice-panel">
        <template v-if="currentQuestion">
          <div class="panel__eyebrow">当前题目</div>
          <div class="question-panel__header">
            <h2 class="panel__title">{{ promptTitle }}</h2>
            <div class="question-panel__chips">
              <span class="chip">题型：{{ questionTypeLabel(currentQuestion.type) }}</span>
              <span class="chip">第 {{ currentQuestion.chapterId }} 章</span>
              <span class="chip">{{ remainingLabel }}</span>
            </div>
          </div>

          <div class="question-card">
            <p class="question-card__prompt">{{ currentQuestion.prompt }}</p>
            <pre
              v-if="currentQuestion.type === 'code'"
              class="question-card__code"
            ><code>{{ currentQuestion.snippet }}</code></pre>
            <div class="question-card__options">
              <button
                v-for="option in currentQuestion.options"
                :key="option"
                type="button"
                class="answer-button"
                :disabled="Boolean(outcome)"
                @click="submitAnswer(option)"
              >
                {{ option }}
              </button>
            </div>
          </div>

          <div
            v-if="outcome"
            class="result-card"
            :class="{
              'result-card--success': outcome.correct,
              'result-card--danger': !outcome.correct,
            }"
          >
            <div class="result-card__title">
              {{ outcome.correct ? "题目已掌握" : "题目仍需复习" }}
            </div>
            <p>{{ outcome.effectLine }}</p>
            <p>
              你的答案：{{ outcome.choice }} |
              正确答案：{{ outcome.answer }}
            </p>
            <p class="result-card__explanation">{{ outcome.explanation }}</p>
          </div>

          <div class="page-links">
            <button
              type="button"
              class="button button--primary"
              @click="advancePrompt"
            >
              {{ advanceLabel }}
            </button>
            <button
              type="button"
              class="button button--ghost"
              @click="resetSession"
            >
              重新开始本轮
            </button>
          </div>
        </template>

        <!-- 完成本轮后先展示一个简洁的结算报告。 -->
        <section
          v-else-if="sessionFinished"
          class="practice-report"
        >
          <div class="panel__eyebrow">练习报告</div>
          <div class="practice-report__header">
            <div>
              <h2 class="panel__title">{{ reportTitle }}</h2>
              <p class="muted-copy">{{ reportMessage }}</p>
            </div>
            <div class="practice-rank">
              <span class="practice-rank__label">评级</span>
              <strong>{{ sessionRank }}</strong>
            </div>
          </div>

          <div class="summary-grid practice-summary">
            <div>
              <span>作答</span>
              <strong>{{ sessionStats.asked }}</strong>
            </div>
            <div>
              <span>正确</span>
              <strong>{{ sessionStats.correct }}</strong>
            </div>
            <div>
              <span>错误</span>
              <strong>{{ sessionStats.missed }}</strong>
            </div>
            <div>
              <span>正确率</span>
              <strong>{{ accuracyLabel }}</strong>
            </div>
            <div>
              <span>清除错题</span>
              <strong>{{ sessionStats.resolvedBacklog }}</strong>
            </div>
            <div>
              <span>最高连击</span>
              <strong>x{{ sessionStats.bestStreak }}</strong>
            </div>
          </div>

          <div class="page-links">
            <button
              type="button"
              class="button button--primary"
              @click="resetSession"
            >
              再来一轮
            </button>
            <button
              type="button"
              class="button button--ghost"
              @click="router.push('/handbook')"
            >
              返回图鉴
            </button>
          </div>
        </section>

        <!-- 空状态同时覆盖无错题复盘和无法开始训练两种情况。 -->
        <section
          v-else
          class="empty-panel practice-empty"
        >
          <div class="panel__eyebrow">队列已清空</div>
          <h2 class="panel__title">{{ emptyTitle }}</h2>
          <p class="muted-copy">{{ emptyMessage }}</p>
          <div class="page-links">
            <button
              type="button"
              class="button button--primary"
              @click="router.push('/handbook')"
            >
              返回图鉴
            </button>
            <button
              type="button"
              class="button button--ghost"
              @click="router.push('/map')"
            >
              返回地图
            </button>
          </div>
        </section>
      </section>
    </section>
  </main>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { chapters, getChapterById } from "../data/chapters";
import { getQuestionById, getQuestionsByChapterId } from "../data/questions";
import { useGameStore } from "../stores/game";

const DRILL_SESSION_SIZE = 5;

// 练习统计同时驱动实时摘要和结算报告。
function createSessionStats() {
  return {
    asked: 0,
    correct: 0,
    missed: 0,
    resolvedBacklog: 0,
    streak: 0,
    bestStreak: 0,
    initialSize: 0,
  };
}

// 打乱章节训练题目，避免每次都完全同顺序。
function shuffleEntries(entries) {
  const nextEntries = [...entries];

  for (let index = nextEntries.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = nextEntries[index];
    nextEntries[index] = nextEntries[swapIndex];
    nextEntries[swapIndex] = current;
  }

  return nextEntries;
}

// 练习评级故意做得简单，方便玩家快速理解结果。
function buildPracticeRank(accuracy, bestStreak, missedAnswers) {
  if (accuracy === 100 && bestStreak >= 4) {
    return "S";
  }

  if (accuracy >= 85 && missedAnswers <= 1) {
    return "A";
  }

  if (accuracy >= 70) {
    return "B";
  }

  return "C";
}

// 练习页同时支持错题复盘和主动章节训练。
const router = useRouter();
const route = useRoute();
const gameStore = useGameStore();

const sessionQueue = ref([]);
const sessionStats = ref(createSessionStats());
const outcome = ref(null);

// 通过 query 参数决定模式，方便图鉴和地图深链跳转。
const practiceMode = computed(() => {
  const rawMode = Array.isArray(route.query.mode)
    ? route.query.mode[0]
    : route.query.mode;

  return rawMode === "drill" ? "drill" : "review";
});

// 章节训练模式只开放已解锁章节。
const unlockedChapters = computed(() =>
  chapters.filter((chapter) => gameStore.player.unlockedChapters.includes(chapter.id)),
);

// 错题复盘允许筛选任意章节，训练模式则回退到首个已解锁章节。
const selectedChapterId = computed(() => {
  const rawChapterId = Array.isArray(route.query.chapter)
    ? route.query.chapter[0]
    : route.query.chapter;
  const parsedChapterId = Number(rawChapterId);

  if (practiceMode.value === "drill") {
    if (unlockedChapters.value.some((chapter) => chapter.id === parsedChapterId)) {
      return parsedChapterId;
    }

    return unlockedChapters.value[0]?.id ?? chapters[0]?.id ?? null;
  }

  return chapters.some((chapter) => chapter.id === parsedChapterId)
    ? parsedChapterId
    : null;
});

// 章节元数据会在标题、标签和报告文案里复用。
const selectedChapter = computed(() =>
  selectedChapterId.value ? getChapterById(selectedChapterId.value) : null,
);

const practiceModeLabel = computed(() =>
  practiceMode.value === "drill" ? "章节训练" : "错题复盘",
);

const pageTitle = computed(() =>
  practiceMode.value === "drill"
    ? "从已解锁章节中抽取一组题目集中训练，并在结算时查看你的评级。"
    : "把错题重新刷一遍，直到这份积压清单开始变短。",
);

const sessionTitle = computed(() =>
  practiceMode.value === "drill" ? "章节专项训练" : "错题清理",
);

const targetLabel = computed(() => {
  if (practiceMode.value === "drill") {
    return selectedChapter.value?.title ?? "暂无章节";
  }

  return selectedChapter.value?.title ?? "全部章节";
});

const practiceDescription = computed(() => {
  if (practiceMode.value === "drill") {
    return "章节训练会从一个已解锁区域里抽取新的混合题目。答错的内容仍然会继续记录进错题本。";
  }

  return "错题复盘会反复轮转尚未掌握的题目，直到你答对为止。答对之后，这道题会从错题本中移除。";
});

// 错题复盘按照错误次数和最近出现时间排序，优先处理更难的题。
function getReviewEntries(chapterId = null) {
  return gameStore.player.wrongQuestions
    .filter((entry) => chapterId === null || entry.chapterId === chapterId)
    .map((entry) => {
      const question = getQuestionById(entry.id);

      if (!question) {
        return null;
      }

      return {
        ...question,
        missCount: entry.count,
        lastSeenAt: entry.lastSeenAt,
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (right.missCount !== left.missCount) {
        return right.missCount - left.missCount;
      }

      return (right.lastSeenAt ?? 0) - (left.lastSeenAt ?? 0);
    });
}

// 章节训练从题库中随机抽题，并控制在一轮短时训练范围内。
function getDrillEntries(chapterId) {
  if (!chapterId) {
    return [];
  }

  return shuffleEntries(getQuestionsByChapterId(chapterId)).slice(0, DRILL_SESSION_SIZE);
}

// 按当前模式和筛选条件构建本轮训练队列。
function buildSessionQueue() {
  return practiceMode.value === "drill"
    ? getDrillEntries(selectedChapterId.value)
    : getReviewEntries(selectedChapterId.value);
}

// 复盘模式沿用错题本筛选，训练模式只展示已解锁章节。
const reviewFilters = computed(() => [
  {
    label: "全部",
    value: "all",
    count: gameStore.player.wrongQuestions.length,
    disabled: false,
  },
  ...chapters.map((chapter) => ({
    label: `第 ${chapter.id} 章`,
    value: chapter.id,
    count: gameStore.player.wrongQuestions.filter(
      (entry) => entry.chapterId === chapter.id,
    ).length,
    disabled: false,
  })),
]);

const drillFilters = computed(() =>
  unlockedChapters.value.map((chapter) => ({
    label: `Chapter ${chapter.id}`,
    value: chapter.id,
    count: getQuestionsByChapterId(chapter.id).length,
    disabled: false,
  })),
);

const activeFilters = computed(() =>
  practiceMode.value === "drill" ? drillFilters.value : reviewFilters.value,
);

// 统一过滤值的形态，兼容 review 的字符串和 drill 的数字章节 id。
const currentFilterValue = computed(() => {
  if (practiceMode.value === "drill") {
    return selectedChapterId.value;
  }

  return selectedChapterId.value ?? "all";
});

// 这些派生状态会同时驱动题头、报告和空状态文案。
const currentQuestion = computed(() => sessionQueue.value[0] ?? null);
const sessionFinished = computed(() => !currentQuestion.value && sessionStats.value.asked > 0);
const accuracy = computed(() => {
  if (sessionStats.value.asked === 0) {
    return 0;
  }

  return Math.round((sessionStats.value.correct / sessionStats.value.asked) * 100);
});

const accuracyLabel = computed(() =>
  sessionStats.value.asked > 0 ? `${accuracy.value}%` : "待开始",
);

const promptTitle = computed(() => {
  if (practiceMode.value === "drill") {
    return `训练题目 ${sessionStats.value.asked + 1}`;
  }

  return `错题题目 ${sessionStats.value.correct + sessionStats.value.missed + 1}`;
});

const remainingLabel = computed(() => {
  if (practiceMode.value === "drill") {
    return `剩余题数：${sessionQueue.value.length}`;
  }

  return `剩余错题：${getReviewEntries(selectedChapterId.value).length}`;
});

const advanceLabel = computed(() => {
  if (practiceMode.value === "review") {
    return sessionQueue.value.length > 1 || !outcome.value?.correct
      ? "下一题"
      : "完成复盘";
  }

  return sessionQueue.value.length > 1 ? "下一道训练题" : "完成训练";
});

const sessionRank = computed(() =>
  sessionStats.value.asked > 0
    ? buildPracticeRank(
        accuracy.value,
        sessionStats.value.bestStreak,
        sessionStats.value.missed,
      )
    : null,
);

const reportTitle = computed(() =>
  practiceMode.value === "drill"
    ? `${selectedChapter.value?.title ?? "章节"} 训练完成。`
    : "错题复盘完成。",
);

const reportMessage = computed(() => {
  if (practiceMode.value === "drill") {
    return accuracy.value >= 85
      ? "这轮表现很稳，这一章的基础掌握已经比较扎实。"
      : "这轮结果已经很好地暴露出薄弱点，相关错题也已经同步记录。";
  }

  if (sessionStats.value.resolvedBacklog === sessionStats.value.initialSize) {
    return "这一轮错题已经全部重新掌握，错题积压明显变轻了。";
  }

  return "这轮复盘已经结束，但有几道题还在轮转，后面还值得再刷一遍。";
});

const emptyTitle = computed(() => {
  if (practiceMode.value === "drill") {
    return "当前章节暂时无法开始训练。";
  }

  return selectedChapter.value
    ? "这一章暂时没有待复盘错题。"
    : "当前暂时没有待复盘错题。";
});

const emptyMessage = computed(() => {
  if (practiceMode.value === "drill") {
    return "可以换到其他已解锁章节，或者回到战斗中继续解锁更多区域和题目。";
  }

  if (selectedChapter.value) {
    return "这一章目前很干净。你可以切换筛选条件，或者直接去做章节训练。";
  }

  return "你现在还没有待复盘题目。之后在战斗或章节训练中答错的新题会出现在这里。";
});

function resetSession() {
  const nextQueue = buildSessionQueue();
  sessionQueue.value = nextQueue;
  sessionStats.value = {
    ...createSessionStats(),
    initialSize: nextQueue.length,
  };
  outcome.value = null;
}

function setMode(nextMode) {
  if (nextMode === "review") {
    router.replace({
      path: "/practice",
      query: selectedChapterId.value ? { chapter: String(selectedChapterId.value) } : {},
    });
    return;
  }

  const nextChapterId =
    unlockedChapters.value.find((chapter) => chapter.id === selectedChapterId.value)?.id ??
    unlockedChapters.value[0]?.id ??
    chapters[0]?.id;

  router.replace({
    path: "/practice",
    query: nextChapterId
      ? { mode: "drill", chapter: String(nextChapterId) }
      : { mode: "drill" },
  });
}

function applyFilter(filterValue) {
  if (practiceMode.value === "drill") {
    router.replace({
      path: "/practice",
      query: {
        mode: "drill",
        chapter: String(filterValue),
      },
    });
    return;
  }

  if (filterValue === "all") {
    router.replace({ path: "/practice" });
    return;
  }

  router.replace({
    path: "/practice",
    query: { chapter: String(filterValue) },
  });
}

function questionTypeLabel(type) {
  if (type === "judge") {
    return "判断题";
  }

  if (type === "code") {
    return "代码补全";
  }

  return "单选题";
}

// 每次作答都会同步更新练习统计，并在必要时改动错题本。
function submitAnswer(option) {
  if (!currentQuestion.value || outcome.value) {
    return;
  }

  const question = currentQuestion.value;
  const correct = option === question.answer;
  const wasTrackedWrong = gameStore.player.wrongQuestions.some(
    (entry) => entry.id === question.id,
  );

  sessionStats.value.asked += 1;

  if (correct) {
    if (wasTrackedWrong && gameStore.resolveWrongQuestion(question.id)) {
      sessionStats.value.resolvedBacklog += 1;
    }

    sessionStats.value.correct += 1;
    sessionStats.value.streak += 1;
    sessionStats.value.bestStreak = Math.max(
      sessionStats.value.bestStreak,
      sessionStats.value.streak,
    );
  } else {
    gameStore.recordWrongQuestion(question);
    sessionStats.value.missed += 1;
    sessionStats.value.streak = 0;
  }

  outcome.value = {
    correct,
    choice: option,
    answer: question.answer,
    explanation: question.explanation,
    effectLine: correct
      ? wasTrackedWrong
        ? "回答正确，这道题已从错题本中移除。"
        : "回答正确，这轮训练保持干净，连击继续累积。"
      : "回答错误，这道题会继续保留在图鉴错题本里。",
  };
}

// 复盘模式会把错题重新放回队列，训练模式则每题只过一遍。
function advancePrompt() {
  if (!currentQuestion.value || !outcome.value) {
    return;
  }

  const [currentEntry, ...restQueue] = sessionQueue.value;

  if (practiceMode.value === "review") {
    sessionQueue.value = outcome.value.correct
      ? restQueue
      : [...restQueue, currentEntry];
  } else {
    sessionQueue.value = restQueue;
  }

  outcome.value = null;
}

// 切换模式或筛选条件时，都会重新建立一轮新的本地练习会话。
watch([practiceMode, selectedChapterId], resetSession, { immediate: true });
</script>
