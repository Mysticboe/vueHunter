<template>
  <main class="page-shell utility-view">
    <header class="panel utility-header">
      <div>
        <div class="panel__eyebrow">设置</div>
        <h1 class="panel__title">管理勇者名号、战斗表现和存档偏好。</h1>
      </div>
      <div class="page-links">
        <button
          type="button"
          class="button button--ghost"
          @click="router.push('/')"
        >
          首页
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
      <!-- 顶部摘要帮助玩家快速看到当前偏好状态。 -->
      <section class="panel panel--wide">
        <div class="panel__eyebrow">偏好总览</div>
        <div class="summary-grid utility-summary">
          <div>
            <span>勇者名号</span>
            <strong>{{ gameStore.player.name }}</strong>
          </div>
          <div>
            <span>已启用偏好</span>
            <strong>{{ enabledPreferenceCount }}/5</strong>
          </div>
          <div>
            <span>当前等级</span>
            <strong>{{ gameStore.player.level }}</strong>
          </div>
          <div>
            <span>已解锁章节</span>
            <strong>{{ gameStore.player.unlockedChapters.length }}</strong>
          </div>
        </div>
        <p class="muted-copy">
          这里的设置会自动保存到浏览器本地存储，不需要额外手动保存整个配置文件。
        </p>
      </section>

      <!-- 名号设置和主偏好共用一个页面，避免来回切换。 -->
      <section class="panel">
        <div class="panel__eyebrow">勇者资料</div>
        <h2 class="panel__title">修改你的勇者名号</h2>
        <p class="muted-copy">
          新名字会立刻同步到当前存档，并在之后的新开局中继续沿用。
        </p>
        <label class="field-block">
          <span class="field-block__label">勇者名称</span>
          <input
            v-model="draftPlayerName"
            type="text"
            maxlength="16"
            class="text-input"
            placeholder="输入新的勇者名号"
          >
        </label>
        <div class="page-links">
          <button
            type="button"
            class="button button--primary"
            @click="applyPlayerName"
          >
            保存名称
          </button>
          <button
            type="button"
            class="button button--ghost"
            @click="restoreDefaultName"
          >
            恢复默认
          </button>
        </div>
        <p
          v-if="nameFeedback"
          class="settings-feedback"
          :class="`settings-feedback--${nameFeedback.tone}`"
        >
          {{ nameFeedback.message }}
        </p>
      </section>

      <!-- 每个偏好单独做成一张卡，阅读和切换都会更直接。 -->
      <section class="panel panel--wide">
        <div class="panel__eyebrow">战斗与界面</div>
        <h2 class="panel__title">切换你想要的表现强度</h2>
        <div class="card-list settings-card-list">
          <article
            v-for="setting in settingCards"
            :key="setting.key"
            class="list-card settings-card"
          >
            <div>
              <strong>{{ setting.title }}</strong>
              <p>{{ setting.description }}</p>
            </div>
            <div class="settings-card__actions">
              <span
                class="chip"
                :class="gameStore.preferences[setting.key] ? 'chip--guard' : 'chip--danger'"
              >
                {{ gameStore.preferences[setting.key] ? "已开启" : "已关闭" }}
              </span>
              <button
                type="button"
                class="button"
                :class="gameStore.preferences[setting.key] ? 'button--ghost' : 'button--primary'"
                @click="togglePreference(setting.key)"
              >
                {{ gameStore.preferences[setting.key] ? "关闭" : "开启" }}
              </button>
            </div>
          </article>
        </div>
      </section>

      <!-- 这一块把备份、迁移和重置进度都收拢到统一入口。 -->
      <section class="panel panel--wide">
        <div class="panel__eyebrow">存档管理</div>
        <h2 class="panel__title">备份、迁移或清理当前进度</h2>
        <div class="summary-grid utility-summary">
          <div>
            <span>最近存档时间</span>
            <strong>{{ formattedLastPlayedAt }}</strong>
          </div>
          <div>
            <span>已击败敌人</span>
            <strong>{{ gameStore.clearedEnemies.length }}</strong>
          </div>
          <div>
            <span>错题本数量</span>
            <strong>{{ gameStore.player.wrongQuestions.length }}</strong>
          </div>
          <div>
            <span>当前进度</span>
            <strong>{{ progressSummary }}</strong>
          </div>
        </div>

        <div class="card-list settings-card-list">
          <article class="list-card list-card--stack">
            <strong>导出存档</strong>
            <p>
              将当前冒险进度下载为 JSON 文件，适合手工备份或迁移到另一台设备。
            </p>
            <div class="page-links">
              <button
                type="button"
                class="button button--primary"
                @click="exportSaveFile"
              >
                导出当前存档
              </button>
            </div>
          </article>

          <article class="list-card list-card--stack">
            <strong>导入存档</strong>
            <p>
              选择之前导出的 JSON 文件，当前进度会被导入内容完整覆盖。
            </p>
            <input
              ref="fileInput"
              type="file"
              accept=".json,application/json"
              class="visually-hidden"
              @change="importSaveFile"
            >
            <div class="page-links">
              <button
                type="button"
                class="button button--ghost"
                @click="openImportPicker"
              >
                选择存档文件
              </button>
            </div>
          </article>

          <article class="list-card list-card--stack">
            <strong>重置当前进度</strong>
            <p class="settings-danger-copy">
              会清空章节、奖励、背包和错题进度，但会保留当前勇者名称与界面偏好。
            </p>
            <div class="page-links">
              <button
                type="button"
                class="button"
                :class="resetGuardArmed ? 'button--danger' : 'button--ghost'"
                @click="handleResetProgress"
              >
                {{ resetGuardArmed ? "再次点击确认清空" : "清空当前进度" }}
              </button>
              <button
                v-if="resetGuardArmed"
                type="button"
                class="button button--ghost"
                @click="cancelResetProgress"
              >
                取消
              </button>
            </div>
          </article>
        </div>

        <p
          v-if="transferFeedback"
          class="settings-feedback"
          :class="`settings-feedback--${transferFeedback.tone}`"
        >
          {{ transferFeedback.message }}
        </p>
      </section>

      <!-- 这一块主要承接当前体验说明。 -->
      <section class="panel panel--wide">
        <div class="panel__eyebrow">当前说明</div>
        <h2 class="panel__title">你现在的体验模式</h2>
        <div class="card-list">
          <article class="list-card list-card--stack">
            <strong>战斗表现</strong>
            <p>{{ battleDisplaySummary }}</p>
          </article>
          <article class="list-card list-card--stack">
            <strong>战场信息</strong>
            <p>{{ informationSummary }}</p>
          </article>
          <article class="list-card list-card--stack">
            <strong>动作偏好</strong>
            <p>{{ motionSummary }}</p>
          </article>
        </div>
      </section>
    </section>
  </main>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";

import { useGameStore } from "../stores/game";
import { parseGameSnapshot, serializeGameSnapshot } from "../utils/save";

// 设置页主要负责维护偏好、资料和存档，不改动主战斗流程本身。
const router = useRouter();
const gameStore = useGameStore();
const fileInput = ref(null);
const draftPlayerName = ref(gameStore.preferences.playerName);
const nameFeedback = ref(null);
const transferFeedback = ref(null);
const resetGuardArmed = ref(false);

// 偏好列表集中定义，模板层只负责渲染。
const settingCards = [
  {
    key: "showBattleEffects",
    title: "战斗特效",
    description: "控制战场震动、受击闪烁、浮动伤害和命中特效。",
  },
  {
    key: "showBattleAnnouncer",
    title: "回合播报",
    description: "在每个关键回合额外显示一条高亮战场播报。",
  },
  {
    key: "showBattleForecast",
    title: "战术预警",
    description: "显示敌方技能、威胁等级和预计承伤等提前信息。",
  },
  {
    key: "showBattleLog",
    title: "战斗记录",
    description: "保留最近几条战斗事件，方便复盘每回合发生了什么。",
  },
  {
    key: "reducedMotion",
    title: "减少动态",
    description: "关闭大部分动画和动效，保留更安静、更稳定的界面表现。",
  },
];

// 统计当前一共启用了多少个偏好。
const enabledPreferenceCount = computed(() =>
  settingCards.filter((setting) => gameStore.preferences[setting.key]).length,
);

// 最近游玩时间用本地中文格式展示，帮助玩家确认导出的是不是最新进度。
const formattedLastPlayedAt = computed(() => {
  if (!gameStore.lastPlayedAt) {
    return "尚未开始";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(gameStore.lastPlayedAt);
});

const progressSummary = computed(
  () => `${gameStore.clearedChaptersCount}/${gameStore.player.unlockedChapters.length} 章已通关`,
);

const battleDisplaySummary = computed(() => {
  const effectsEnabled = gameStore.preferences.showBattleEffects ? "开启" : "关闭";
  const announcerEnabled = gameStore.preferences.showBattleAnnouncer ? "开启" : "关闭";

  return `战斗特效目前${effectsEnabled}，回合播报${announcerEnabled}。`;
});

const informationSummary = computed(() => {
  const forecastEnabled = gameStore.preferences.showBattleForecast ? "显示" : "隐藏";
  const logEnabled = gameStore.preferences.showBattleLog ? "显示" : "隐藏";

  return `战术预警当前${forecastEnabled}，战斗记录当前${logEnabled}。`;
});

const motionSummary = computed(() =>
  gameStore.preferences.reducedMotion
    ? "当前处于减少动态模式，页面会尽量保持安静稳定。"
    : "当前保留完整动效反馈，命中、格挡和胜负都会更明显。",
);

// 如果名字在其他地方被同步修改，这里也要跟上。
watch(
  () => gameStore.preferences.playerName,
  (nextName) => {
    draftPlayerName.value = nextName;
  },
);

// 名号修改走统一 action，避免当前玩家名和偏好名不同步。
function applyPlayerName() {
  const nextName = gameStore.setPlayerName(draftPlayerName.value);
  draftPlayerName.value = nextName;
  nameFeedback.value = {
    tone: "success",
    message: `勇者名号已更新为「${nextName}」。`,
  };
}

function restoreDefaultName() {
  const nextName = gameStore.setPlayerName("前端勇者");
  draftPlayerName.value = nextName;
  nameFeedback.value = {
    tone: "muted",
    message: "勇者名号已经恢复为默认值。",
  };
}

// 开关类偏好都从这条路径进入，保持写入逻辑一致。
function togglePreference(key) {
  gameStore.setPreference(key, !gameStore.preferences[key]);
}

// 导出按钮会立即生成一份包含当前状态的 JSON 文件。
function exportSaveFile() {
  if (typeof window === "undefined") {
    return;
  }

  const snapshot = serializeGameSnapshot(gameStore.exportSaveData());
  const blob = new Blob([snapshot], { type: "application/json;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const safeName = (gameStore.player.name || "前端勇者")
    .trim()
    .replace(/[^\w\u4e00-\u9fa5-]+/g, "-");

  anchor.href = url;
  anchor.download = `vue-hunter-${safeName || "save"}-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  window.URL.revokeObjectURL(url);

  transferFeedback.value = {
    tone: "success",
    message: "当前存档已经导出为 JSON 文件，可以拿去备份或迁移。",
  };
}

// 导入会完整覆盖当前进度，因此先统一解析并走 store 的兼容逻辑。
async function importSaveFile(event) {
  const input = event.target;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  const snapshot = parseGameSnapshot(await file.text());

  if (!snapshot) {
    transferFeedback.value = {
      tone: "danger",
      message: "没有读出有效存档，请确认你选择的是本项目导出的 JSON 文件。",
    };
    input.value = "";
    return;
  }

  const imported = gameStore.importSaveData(snapshot);

  if (!imported) {
    transferFeedback.value = {
      tone: "danger",
      message: "导入失败，存档结构不完整或内容无效。",
    };
    input.value = "";
    return;
  }

  resetGuardArmed.value = false;
  draftPlayerName.value = gameStore.preferences.playerName;
  transferFeedback.value = {
    tone: "success",
    message: `已导入「${gameStore.player.name}」的存档，当前解锁 ${gameStore.player.unlockedChapters.length} 个章节。`,
  };
  input.value = "";
}

// 文件选择器保持隐藏，只在点击按钮时触发，避免占用版面。
function openImportPicker() {
  fileInput.value?.click();
}

// 危险操作采用二次确认，防止误触直接清空当前进度。
function handleResetProgress() {
  if (!resetGuardArmed.value) {
    resetGuardArmed.value = true;
    transferFeedback.value = {
      tone: "danger",
      message: "再次点击“清空当前进度”才会真正执行，勇者名号和偏好设置会被保留。",
    };
    return;
  }

  gameStore.resetGame();
  resetGuardArmed.value = false;
  draftPlayerName.value = gameStore.preferences.playerName;
  transferFeedback.value = {
    tone: "success",
    message: "当前进度已经清空，你可以重新开始新的试炼了。",
  };
}

function cancelResetProgress() {
  resetGuardArmed.value = false;
  transferFeedback.value = {
    tone: "muted",
    message: "已取消清空进度，本次冒险记录保持不变。",
  };
}
</script>
