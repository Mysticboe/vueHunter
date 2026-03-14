// Exp thresholds use array position + 1 to map directly to display levels.
export const LEVEL_THRESHOLDS = [0, 60, 150, 280, 460, 700, 1000];

// Walk downward so the first matching threshold is the highest unlocked level.
export function getLevelFromExp(exp) {
  for (let index = LEVEL_THRESHOLDS.length - 1; index >= 0; index -= 1) {
    if (exp >= LEVEL_THRESHOLDS[index]) {
      return index + 1;
    }
  }

  return 1;
}

// The next threshold is looked up from the current level index.
export function getNextLevelExp(level) {
  return LEVEL_THRESHOLDS[level] ?? null;
}

// Level growth is linear in the MVP so combat balance stays easy to tune.
export function getStatsForLevel(level) {
  const growth = Math.max(0, level - 1);

  return {
    maxHp: 100 + growth * 18,
    maxMp: 40 + growth * 9,
    attack: 14 + growth * 4,
    defense: 6 + growth * 2,
  };
}
