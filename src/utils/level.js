// 经验阈值用数组下标加一，直接对应界面展示的等级。
export const LEVEL_THRESHOLDS = [0, 60, 150, 280, 460, 700, 1000];

// 从后往前找，第一个命中的阈值就是当前已解锁的最高等级。
export function getLevelFromExp(exp) {
  for (let index = LEVEL_THRESHOLDS.length - 1; index >= 0; index -= 1) {
    if (exp >= LEVEL_THRESHOLDS[index]) {
      return index + 1;
    }
  }

  return 1;
}

// 下一等级阈值直接按当前等级索引读取。
export function getNextLevelExp(level) {
  return LEVEL_THRESHOLDS[level] ?? null;
}

// MVP 里属性成长保持线性，方便后续继续微调战斗数值。
export function getStatsForLevel(level) {
  const growth = Math.max(0, level - 1);

  return {
    maxHp: 100 + growth * 18,
    maxMp: 40 + growth * 9,
    attack: 14 + growth * 4,
    defense: 6 + growth * 2,
  };
}
