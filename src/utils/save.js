const STORAGE_KEY = "vue-hunter-save-v1";

// 统一 JSON 解析入口，让本地读取和手工导入复用同一套安全校验。
export function parseGameSnapshot(raw, sourceLabel = "导入的存档文件") {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`无法解析${sourceLabel}。`, error);
    return null;
  }
}

// 导出时统一格式化 JSON，方便手工备份和查看。
export function serializeGameSnapshot(state) {
  return JSON.stringify(state, null, 2);
}

// 浏览器端应用启动时，优先读取最近一次本地存档。
export function loadGame() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  return parseGameSnapshot(raw, "本地存档");
}

// 游戏完全运行在客户端，因此直接持久化整份状态快照。
export function saveGame(state) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// 玩家选择彻底重开时，需要同步清空本地存档。
export function clearGameSave() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}
