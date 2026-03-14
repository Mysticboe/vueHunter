<template>
  <main class="page-shell utility-view">
    <header class="panel utility-header">
      <div>
        <div class="panel__eyebrow">Practice Hall</div>
        <h1 class="panel__title">{{ pageTitle }}</h1>
      </div>
      <div class="page-links">
        <button
          type="button"
          class="button button--ghost"
          @click="router.push('/handbook')"
        >
          Handbook
        </button>
        <button
          type="button"
          class="button button--ghost"
          @click="router.push('/map')"
        >
          Map
        </button>
      </div>
    </header>

    <section class="utility-grid">
      <section class="panel">
        <div class="panel__eyebrow">Session</div>
        <h2 class="panel__title">{{ sessionTitle }}</h2>
        <div class="summary-grid practice-summary">
          <div>
            <span>Mode</span>
            <strong>{{ practiceModeLabel }}</strong>
          </div>
          <div>
            <span>Target</span>
            <strong>{{ targetLabel }}</strong>
          </div>
          <div>
            <span>Accuracy</span>
            <strong>{{ accuracyLabel }}</strong>
          </div>
          <div>
            <span>Resolved</span>
            <strong>{{ sessionStats.resolvedBacklog }}</strong>
          </div>
          <div>
            <span>Missed</span>
            <strong>{{ sessionStats.missed }}</strong>
          </div>
          <div>
            <span>Best streak</span>
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
            Wrong-answer review
          </button>
          <button
            type="button"
            class="button"
            :class="practiceMode === 'drill' ? 'button--primary' : 'button--ghost'"
            @click="setMode('drill')"
          >
            Chapter drill
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

      <section class="panel panel--wide practice-panel">
        <template v-if="currentQuestion">
          <div class="panel__eyebrow">Current Prompt</div>
          <div class="question-panel__header">
            <h2 class="panel__title">{{ promptTitle }}</h2>
            <div class="question-panel__chips">
              <span class="chip">Type: {{ questionTypeLabel(currentQuestion.type) }}</span>
              <span class="chip">Chapter {{ currentQuestion.chapterId }}</span>
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
              {{ outcome.correct ? "Prompt stabilized" : "Prompt still unstable" }}
            </div>
            <p>{{ outcome.effectLine }}</p>
            <p>
              Chosen answer: {{ outcome.choice }} |
              Correct answer: {{ outcome.answer }}
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
              Restart session
            </button>
          </div>
        </template>

        <section
          v-else-if="sessionFinished"
          class="practice-report"
        >
          <div class="panel__eyebrow">Session Report</div>
          <div class="practice-report__header">
            <div>
              <h2 class="panel__title">{{ reportTitle }}</h2>
              <p class="muted-copy">{{ reportMessage }}</p>
            </div>
            <div class="practice-rank">
              <span class="practice-rank__label">Rank</span>
              <strong>{{ sessionRank }}</strong>
            </div>
          </div>

          <div class="summary-grid practice-summary">
            <div>
              <span>Answered</span>
              <strong>{{ sessionStats.asked }}</strong>
            </div>
            <div>
              <span>Correct</span>
              <strong>{{ sessionStats.correct }}</strong>
            </div>
            <div>
              <span>Missed</span>
              <strong>{{ sessionStats.missed }}</strong>
            </div>
            <div>
              <span>Accuracy</span>
              <strong>{{ accuracyLabel }}</strong>
            </div>
            <div>
              <span>Resolved backlog</span>
              <strong>{{ sessionStats.resolvedBacklog }}</strong>
            </div>
            <div>
              <span>Best streak</span>
              <strong>x{{ sessionStats.bestStreak }}</strong>
            </div>
          </div>

          <div class="page-links">
            <button
              type="button"
              class="button button--primary"
              @click="resetSession"
            >
              Run it again
            </button>
            <button
              type="button"
              class="button button--ghost"
              @click="router.push('/handbook')"
            >
              Back to handbook
            </button>
          </div>
        </section>

        <section
          v-else
          class="empty-panel practice-empty"
        >
          <div class="panel__eyebrow">Queue Clear</div>
          <h2 class="panel__title">{{ emptyTitle }}</h2>
          <p class="muted-copy">{{ emptyMessage }}</p>
          <div class="page-links">
            <button
              type="button"
              class="button button--primary"
              @click="router.push('/handbook')"
            >
              Return to handbook
            </button>
            <button
              type="button"
              class="button button--ghost"
              @click="router.push('/map')"
            >
              Return to map
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

const router = useRouter();
const route = useRoute();
const gameStore = useGameStore();

const sessionQueue = ref([]);
const sessionStats = ref(createSessionStats());
const outcome = ref(null);

const practiceMode = computed(() => {
  const rawMode = Array.isArray(route.query.mode)
    ? route.query.mode[0]
    : route.query.mode;

  return rawMode === "drill" ? "drill" : "review";
});

const unlockedChapters = computed(() =>
  chapters.filter((chapter) => gameStore.player.unlockedChapters.includes(chapter.id)),
);

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

const selectedChapter = computed(() =>
  selectedChapterId.value ? getChapterById(selectedChapterId.value) : null,
);

const practiceModeLabel = computed(() =>
  practiceMode.value === "drill" ? "Chapter drill" : "Wrong-answer review",
);

const pageTitle = computed(() =>
  practiceMode.value === "drill"
    ? "Train a chapter with a fresh mixed set of prompts and check your rank at the end."
    : "Rework missed prompts until the backlog starts to clear.",
);

const sessionTitle = computed(() =>
  practiceMode.value === "drill" ? "Focused chapter training" : "Backlog cleanup",
);

const targetLabel = computed(() => {
  if (practiceMode.value === "drill") {
    return selectedChapter.value?.title ?? "No chapter";
  }

  return selectedChapter.value?.title ?? "All chapters";
});

const practiceDescription = computed(() => {
  if (practiceMode.value === "drill") {
    return "Chapter drills pull a fresh mixed set of prompts from one unlocked region. Wrong answers are still recorded in the handbook.";
  }

  return "Review mode cycles unresolved prompts until you answer them correctly. Correct answers remove them from the wrong-answer book.";
});

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

function getDrillEntries(chapterId) {
  if (!chapterId) {
    return [];
  }

  return shuffleEntries(getQuestionsByChapterId(chapterId)).slice(0, DRILL_SESSION_SIZE);
}

function buildSessionQueue() {
  return practiceMode.value === "drill"
    ? getDrillEntries(selectedChapterId.value)
    : getReviewEntries(selectedChapterId.value);
}

const reviewFilters = computed(() => [
  {
    label: "All",
    value: "all",
    count: gameStore.player.wrongQuestions.length,
    disabled: false,
  },
  ...chapters.map((chapter) => ({
    label: `Chapter ${chapter.id}`,
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

const currentFilterValue = computed(() => {
  if (practiceMode.value === "drill") {
    return selectedChapterId.value;
  }

  return selectedChapterId.value ?? "all";
});

const currentQuestion = computed(() => sessionQueue.value[0] ?? null);
const sessionFinished = computed(() => !currentQuestion.value && sessionStats.value.asked > 0);
const accuracy = computed(() => {
  if (sessionStats.value.asked === 0) {
    return 0;
  }

  return Math.round((sessionStats.value.correct / sessionStats.value.asked) * 100);
});

const accuracyLabel = computed(() =>
  sessionStats.value.asked > 0 ? `${accuracy.value}%` : "Pending",
);

const promptTitle = computed(() => {
  if (practiceMode.value === "drill") {
    return `Drill prompt ${sessionStats.value.asked + 1}`;
  }

  return `Backlog prompt ${sessionStats.value.correct + sessionStats.value.missed + 1}`;
});

const remainingLabel = computed(() => {
  if (practiceMode.value === "drill") {
    return `Queue left: ${sessionQueue.value.length}`;
  }

  return `Backlog left: ${getReviewEntries(selectedChapterId.value).length}`;
});

const advanceLabel = computed(() => {
  if (practiceMode.value === "review") {
    return sessionQueue.value.length > 1 || !outcome.value?.correct
      ? "Next prompt"
      : "Finish review";
  }

  return sessionQueue.value.length > 1 ? "Next drill prompt" : "Finish drill";
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
    ? `${selectedChapter.value?.title ?? "Chapter"} drill complete.`
    : "Wrong-answer review complete.",
);

const reportMessage = computed(() => {
  if (practiceMode.value === "drill") {
    return accuracy.value >= 85
      ? "Strong run. Your chapter fundamentals are holding up under pressure."
      : "Good signal on what still needs work. The wrong-answer book has been updated where needed.";
  }

  if (sessionStats.value.resolvedBacklog === sessionStats.value.initialSize) {
    return "Every prompt in this review set was stabilized. The backlog is lighter now.";
  }

  return "The session is complete, but a few prompts still cycled before you locked them in.";
});

const emptyTitle = computed(() => {
  if (practiceMode.value === "drill") {
    return "No drill session is ready for this chapter.";
  }

  return selectedChapter.value
    ? "No missed prompts are waiting in this chapter."
    : "No missed prompts are waiting right now.";
});

const emptyMessage = computed(() => {
  if (practiceMode.value === "drill") {
    return "Switch to another unlocked chapter or head back into battle to unlock more regions and prompts.";
  }

  if (selectedChapter.value) {
    return "This chapter is currently clean. Try another filter or jump into a fresh chapter drill.";
  }

  return "You do not have unresolved prompts yet. New misses from battle or chapter drills will appear here for focused review.";
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
    return "Judge";
  }

  if (type === "code") {
    return "Code Fill";
  }

  return "Single Choice";
}

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
        ? "Correct answer. This prompt is removed from the wrong-answer book."
        : "Correct answer. The drill stays clean and your streak continues."
      : "Wrong answer. The handbook keeps this prompt active for another review pass.",
  };
}

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

watch([practiceMode, selectedChapterId], resetSession, { immediate: true });
</script>
