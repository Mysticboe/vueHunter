export const LEVEL_THRESHOLDS = [0, 60, 150, 280, 460, 700, 1000];

export function getLevelFromExp(exp) {
  for (let index = LEVEL_THRESHOLDS.length - 1; index >= 0; index -= 1) {
    if (exp >= LEVEL_THRESHOLDS[index]) {
      return index + 1;
    }
  }

  return 1;
}

export function getNextLevelExp(level) {
  return LEVEL_THRESHOLDS[level] ?? null;
}

export function getStatsForLevel(level) {
  const growth = Math.max(0, level - 1);

  return {
    maxHp: 100 + growth * 18,
    maxMp: 40 + growth * 9,
    attack: 14 + growth * 4,
    defense: 6 + growth * 2,
  };
}

