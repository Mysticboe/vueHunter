import { defineStore } from "pinia";

import { chapters, getChapterById } from "../data/chapters";
import { enemies, getEnemyById } from "../data/enemies";
import { getItemById } from "../data/items";
import { getSkillById } from "../data/skills";
import { getLevelFromExp, getNextLevelExp, getStatsForLevel } from "../utils/level";
import { clearGameSave, loadGame, saveGame } from "../utils/save";

const CAMP_REST_COST = 14;

// Small stat helpers keep level, gear, and skills composable.
function createStatBlock() {
  return {
    maxHp: 0,
    maxMp: 0,
    attack: 0,
    defense: 0,
  };
}

// Merge stat sources into one final combat-ready block.
function mergeStatBlocks(base, bonus = {}) {
  return {
    maxHp: base.maxHp + (bonus.maxHp ?? 0),
    maxMp: base.maxMp + (bonus.maxMp ?? 0),
    attack: base.attack + (bonus.attack ?? 0),
    defense: base.defense + (bonus.defense ?? 0),
  };
}

// Save files may contain old inventory shapes, so normalize everything here first.
function normalizeInventory(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  const bucket = new Map();

  for (const entry of entries) {
    const nextEntry =
      typeof entry === "string"
        ? { itemId: entry, quantity: 1 }
        : {
            itemId: entry?.itemId,
            quantity: Number(entry?.quantity) > 0 ? Number(entry.quantity) : 1,
          };

    if (!nextEntry.itemId || !getItemById(nextEntry.itemId)) {
      continue;
    }

    const previousQuantity = bucket.get(nextEntry.itemId) ?? 0;
    bucket.set(nextEntry.itemId, previousQuantity + nextEntry.quantity);
  }

  return Array.from(bucket.entries()).map(([itemId, quantity]) => ({
    itemId,
    quantity,
  }));
}

// Equipment used to be stored as arrays, so this keeps backward compatibility.
function normalizeEquippedItems(equippedItems) {
  if (Array.isArray(equippedItems)) {
    return equippedItems.reduce((record, itemId) => {
      const item = getItemById(itemId);

      if (item?.type === "equipment" && item.slot) {
        record[item.slot] = item.id;
      }

      return record;
    }, {});
  }

  if (!equippedItems || typeof equippedItems !== "object") {
    return {};
  }

  return Object.entries(equippedItems).reduce((record, [slot, itemId]) => {
    const item = getItemById(itemId);

    if (item?.type === "equipment" && item.slot === slot) {
      record[slot] = item.id;
    }

    return record;
  }, {});
}

// Guard against invalid skill ids when hydrating from old or edited saves.
function normalizeSkillIds(skillIds) {
  if (!Array.isArray(skillIds)) {
    return [];
  }

  return [...new Set(skillIds.filter((skillId) => getSkillById(skillId)))];
}

// Equipment bonuses are summed every time the player sheet is recalculated.
function collectEquipmentBonus(player) {
  return Object.values(player.equippedItems ?? {}).reduce((bonus, itemId) => {
    const item = getItemById(itemId);

    if (!item?.stats) {
      return bonus;
    }

    return mergeStatBlocks(bonus, item.stats);
  }, createStatBlock());
}

// Learned passive skills affect the same stat pipeline as equipment.
function collectSkillBonus(player) {
  return player.skills.reduce((bonus, skillId) => {
    const skill = getSkillById(skillId);

    if (!skill?.stats) {
      return bonus;
    }

    return mergeStatBlocks(bonus, skill.stats);
  }, createStatBlock());
}

// Build the starter player with beginner gear already equipped.
function createFreshPlayer() {
  const baseStats = getStatsForLevel(1);
  const inventory = normalizeInventory([
    { itemId: "patch-potion", quantity: 2 },
    { itemId: "focus-tonic", quantity: 1 },
    { itemId: "ref-training-sword", quantity: 1 },
    { itemId: "oak-guard-cloak", quantity: 1 },
  ]);
  const equippedItems = {
    weapon: "ref-training-sword",
    armor: "oak-guard-cloak",
  };
  const tempPlayer = {
    equippedItems,
    skills: [],
  };
  const finalStats = mergeStatBlocks(
    mergeStatBlocks(baseStats, collectEquipmentBonus(tempPlayer)),
    collectSkillBonus(tempPlayer),
  );

  return {
    name: "Front-end Hunter",
    level: 1,
    exp: 0,
    hp: finalStats.maxHp,
    maxHp: finalStats.maxHp,
    mp: finalStats.maxMp,
    maxMp: finalStats.maxMp,
    attack: finalStats.attack,
    defense: finalStats.defense,
    gold: 0,
    skillPoints: 1,
    skills: [],
    inventory,
    equippedItems,
    unlockedChapters: [1],
    wrongQuestions: [],
  };
}

// The root state keeps both permanent run progress and long-term achievement data.
function createFreshState() {
  return {
    version: 4,
    started: false,
    lastPlayedAt: null,
    player: createFreshPlayer(),
    clearedEnemies: [],
    encounteredEnemies: [],
    achievements: {
      totalVictories: 0,
      bossVictories: 0,
      highestCombo: 0,
      flawlessEnemyIds: [],
    },
  };
}

// Merge a save into the current schema while preserving safe fallbacks.
function mergeSavedState(savedState) {
  const freshState = createFreshState();
  const savedPlayer = savedState?.player ?? {};
  const freshPlayer = freshState.player;
  const inventory = normalizeInventory(savedPlayer.inventory);
  const hasSavedInventory = Array.isArray(savedPlayer.inventory);
  const normalizedEquippedItems = normalizeEquippedItems(savedPlayer.equippedItems);
  const hasSavedEquippedItems =
    Array.isArray(savedPlayer.equippedItems) ||
    (!!savedPlayer.equippedItems && typeof savedPlayer.equippedItems === "object");

  return {
    ...freshState,
    ...savedState,
    player: {
      ...freshPlayer,
      ...savedPlayer,
      skillPoints:
        Number(savedPlayer.skillPoints) >= 0
          ? Number(savedPlayer.skillPoints)
          : freshPlayer.skillPoints,
      skills: normalizeSkillIds(savedPlayer.skills),
      inventory: hasSavedInventory ? inventory : freshPlayer.inventory,
      equippedItems: hasSavedEquippedItems
        ? normalizedEquippedItems
        : freshPlayer.equippedItems,
      unlockedChapters: Array.isArray(savedPlayer.unlockedChapters)
        ? [...new Set(savedPlayer.unlockedChapters)].sort((left, right) => left - right)
        : freshPlayer.unlockedChapters,
      wrongQuestions: Array.isArray(savedPlayer.wrongQuestions)
        ? savedPlayer.wrongQuestions
        : freshPlayer.wrongQuestions,
    },
    clearedEnemies: Array.isArray(savedState?.clearedEnemies)
      ? [...new Set(savedState.clearedEnemies)]
      : freshState.clearedEnemies,
    encounteredEnemies: Array.isArray(savedState?.encounteredEnemies)
      ? [...new Set(savedState.encounteredEnemies)]
      : freshState.encounteredEnemies,
    achievements: {
      ...freshState.achievements,
      ...(savedState?.achievements ?? {}),
      flawlessEnemyIds: Array.isArray(savedState?.achievements?.flawlessEnemyIds)
        ? [...new Set(savedState.achievements.flawlessEnemyIds)]
        : freshState.achievements.flawlessEnemyIds,
    },
  };
}

export const useGameStore = defineStore("game", {
  state: () => createFreshState(),

  getters: {
    // A run counts as active as soon as we have meaningful state to resume.
    hasProgress: (state) =>
      state.started ||
      state.clearedEnemies.length > 0 ||
      state.encounteredEnemies.length > 0 ||
      state.lastPlayedAt !== null,

    // Surface the next exp breakpoint for the map and HUD.
    nextLevelExp: (state) => getNextLevelExp(state.player.level),

    // Chapter cards use this to render local progress without duplicating logic.
    chapterProgress: (state) => (chapterId) => {
      const chapter = getChapterById(chapterId);

      if (!chapter) {
        return {
          cleared: 0,
          total: 0,
        };
      }

      const cleared = chapter.enemyIds.filter((enemyId) =>
        state.clearedEnemies.includes(enemyId),
      ).length;

      return {
        cleared,
        total: chapter.enemyIds.length,
      };
    },

    // Keep the sidebar review board focused on the most recent misses.
    recentWrongQuestions: (state) => state.player.wrongQuestions.slice(0, 4),

    // Count fully cleared chapters for milestones and map progression.
    clearedChaptersCount: (state) =>
      chapters.filter((chapter) =>
        chapter.enemyIds.every((enemyId) => state.clearedEnemies.includes(enemyId)),
      ).length,

    // Point the player toward the next useful chapter, unlocked or not yet open.
    nextTargetChapter: (state) => {
      const unlockedOpenChapter = chapters.find((chapter) => {
        if (!state.player.unlockedChapters.includes(chapter.id)) {
          return false;
        }

        return chapter.enemyIds.some(
          (enemyId) => !state.clearedEnemies.includes(enemyId),
        );
      });

      if (unlockedOpenChapter) {
        return unlockedOpenChapter;
      }

      return chapters.find(
        (chapter) => !state.player.unlockedChapters.includes(chapter.id),
      ) ?? null;
    },

    // Build the quest-board headline from whichever chapter is currently most relevant.
    activeQuest() {
      const targetChapter = this.nextTargetChapter;

      if (!targetChapter) {
        return {
          title: "World Stabilized",
          description: "Every visible chapter has been cleared. Time to extend the continent.",
          progressLabel: `${this.clearedChaptersCount}/${chapters.length} chapters`,
        };
      }

      const progress = this.chapterProgress(targetChapter.id);
      const unlocked = this.player.unlockedChapters.includes(targetChapter.id);

      if (unlocked) {
        return {
          title: `Clear ${targetChapter.title}`,
          description: targetChapter.storyBeat,
          progressLabel: `${progress.cleared}/${progress.total} encounters`,
        };
      }

      const previousChapter = chapters.find(
        (chapter) => chapter.id === targetChapter.id - 1,
      );
      const previousProgress = previousChapter
        ? this.chapterProgress(previousChapter.id)
        : { cleared: 0, total: 0 };

      return {
        title: `Unlock ${targetChapter.title}`,
        description: `Finish ${previousChapter?.title ?? "the current frontier"} to open the next route.`,
        progressLabel: `${previousProgress.cleared}/${previousProgress.total} previous encounters`,
      };
    },

    // Keep the quest board checklist short and directly actionable.
    questChecklist() {
      const targetChapter = this.nextTargetChapter;
      const nextBoss = enemies.find((enemy) => {
        if (!targetChapter || enemy.chapterId !== targetChapter.id || enemy.role !== "Boss") {
          return false;
        }

        return !this.clearedEnemies.includes(enemy.id);
      });

      return [
        {
          title: "Frontier",
          body: targetChapter
            ? `${targetChapter.title} is your next major checkpoint.`
            : "All currently designed frontiers have been cleared.",
        },
        {
          title: "Boss Target",
          body: nextBoss
            ? `${nextBoss.name} is still guarding the route forward.`
            : "No active boss target. A new chapter or rematch is available.",
        },
        {
          title: "Revision",
          body:
            this.recentWrongQuestions.length > 0
              ? `${this.recentWrongQuestions.length} recent prompts are waiting in the handbook.`
              : "Your recent answer log is clean.",
        },
      ];
    },

    // Milestones provide long-term goals beyond simple chapter completion.
    milestoneCards() {
      return [
        {
          title: "First Victory",
          unlocked: this.achievements.totalVictories >= 1,
          progressLabel: `${Math.min(this.achievements.totalVictories, 1)}/1`,
          body: "Win your first trial on the continent.",
        },
        {
          title: "Boss Breaker",
          unlocked: this.achievements.bossVictories >= 3,
          progressLabel: `${this.achievements.bossVictories}/3`,
          body: "Defeat three chapter bosses.",
        },
        {
          title: "Perfect Route",
          unlocked: this.achievements.flawlessEnemyIds.length >= 1,
          progressLabel: `${this.achievements.flawlessEnemyIds.length}/1`,
          body: "Finish any encounter without a wrong answer.",
        },
        {
          title: "Combo Scholar",
          unlocked: this.achievements.highestCombo >= 4,
          progressLabel: `${this.achievements.highestCombo}/4`,
          body: "Reach a combo streak of four correct answers.",
        },
        {
          title: "Cartographer",
          unlocked: this.clearedChaptersCount >= chapters.length,
          progressLabel: `${this.clearedChaptersCount}/${chapters.length}`,
          body: "Fully clear every currently visible chapter on the map.",
        },
        {
          title: "State Sovereign",
          unlocked: this.clearedEnemies.includes(702),
          progressLabel: this.clearedEnemies.includes(702) ? "Complete" : "Pending",
          body: "Defeat the State Disorder King in the final temple.",
        },
      ];
    },

    // Skills can only unlock when the run satisfies level, chapter, and prerequisite gates.
    canUnlockSkill: (state) => (skillId) => {
      const skill = getSkillById(skillId);

      if (!skill) {
        return false;
      }

      if (state.player.skills.includes(skillId)) {
        return false;
      }

      if (state.player.skillPoints < skill.cost) {
        return false;
      }

      if (state.player.level < skill.unlockLevel) {
        return false;
      }

      if (!state.player.unlockedChapters.includes(skill.chapterId)) {
        return false;
      }

      return skill.prerequisites.every((requiredSkillId) =>
        state.player.skills.includes(requiredSkillId),
      );
    },

    // Inventory views ask for quantities by item id.
    itemQuantity: (state) => (itemId) =>
      state.player.inventory.find((entry) => entry.itemId === itemId)?.quantity ?? 0,
  },

  actions: {
    // Boot-time hydrate keeps old saves compatible with the newest schema.
    hydrateFromSave() {
      const savedState = loadGame();

      if (!savedState) {
        return;
      }

      this.$patch(mergeSavedState(savedState));
      this.recalculatePlayer(false);
    },

    // Autosave subscribes once and then mirrors every state change to localStorage.
    enableAutoSave() {
      if (this._autoSaveReady) {
        return;
      }

      this.$subscribe(
        (_, state) => {
          saveGame(state);
        },
        { detached: true },
      );

      this._autoSaveReady = true;
    },

    // Starting fresh clears all progression while preserving current game rules.
    startNewGame() {
      this.$patch(createFreshState());
      this.started = true;
      this.lastPlayedAt = Date.now();
      this.recalculatePlayer(true);
    },

    // Reset is the hard wipe used from the map town menu.
    resetGame() {
      this.$patch(createFreshState());
      clearGameSave();
    },

    // Rebuild the derived player sheet whenever exp, gear, or skills change.
    recalculatePlayer(restoreVitals = false) {
      const currentHp = this.player.hp;
      const currentMp = this.player.mp;
      const newLevel = getLevelFromExp(this.player.exp);
      const leveledUp = newLevel > this.player.level;
      const baseStats = getStatsForLevel(newLevel);
      const finalStats = mergeStatBlocks(
        mergeStatBlocks(baseStats, collectEquipmentBonus(this.player)),
        collectSkillBonus(this.player),
      );

      this.player.level = newLevel;
      this.player.maxHp = finalStats.maxHp;
      this.player.maxMp = finalStats.maxMp;
      this.player.attack = finalStats.attack;
      this.player.defense = finalStats.defense;

      if (restoreVitals || leveledUp) {
        this.player.hp = finalStats.maxHp;
        this.player.mp = finalStats.maxMp;
      } else {
        this.player.hp = Math.min(currentHp, finalStats.maxHp);
        this.player.mp = Math.min(currentMp, finalStats.maxMp);
      }
    },

    // Sync battle-ending vitals back into the persistent run state.
    syncVitals(nextHp, nextMp) {
      this.player.hp = Math.max(0, Math.min(Math.round(nextHp), this.player.maxHp));
      this.player.mp = Math.max(0, Math.min(Math.round(nextMp), this.player.maxMp));
      this.lastPlayedAt = Date.now();
    },

    // Consumables and camp rest both route through this small healing helper.
    healPlayer(effect = {}) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + (effect.hp ?? 0));
      this.player.mp = Math.min(this.player.maxMp, this.player.mp + (effect.mp ?? 0));
      this.lastPlayedAt = Date.now();
    },

    // Rewards and drops use the same inventory insertion path.
    addItem(itemId, quantity = 1) {
      const item = getItemById(itemId);

      if (!item || quantity <= 0) {
        return false;
      }

      const existingEntry = this.player.inventory.find((entry) => entry.itemId === itemId);

      if (existingEntry) {
        existingEntry.quantity += quantity;
      } else {
        this.player.inventory.push({ itemId, quantity });
      }

      return true;
    },

    // Consumables apply their effect immediately and then reduce stack count.
    useItem(itemId) {
      const item = getItemById(itemId);
      const inventoryEntry = this.player.inventory.find((entry) => entry.itemId === itemId);

      if (!item || item.type !== "consumable" || !inventoryEntry || inventoryEntry.quantity < 1) {
        return false;
      }

      this.healPlayer(item.effect);
      inventoryEntry.quantity -= 1;

      if (inventoryEntry.quantity <= 0) {
        this.player.inventory = this.player.inventory.filter(
          (entry) => entry.itemId !== itemId,
        );
      }

      return true;
    },

    // Equipping the same item twice acts as a toggle for that slot.
    equipItem(itemId) {
      const item = getItemById(itemId);
      const inventoryEntry = this.player.inventory.find((entry) => entry.itemId === itemId);

      if (!item || item.type !== "equipment" || !inventoryEntry || inventoryEntry.quantity < 1) {
        return false;
      }

      if (this.player.equippedItems[item.slot] === itemId) {
        delete this.player.equippedItems[item.slot];
      } else {
        this.player.equippedItems[item.slot] = itemId;
      }

      this.recalculatePlayer(false);
      this.lastPlayedAt = Date.now();
      return true;
    },

    // Skills permanently modify the player sheet and spend skill points.
    unlockSkill(skillId) {
      const skill = getSkillById(skillId);

      if (!skill || !this.canUnlockSkill(skillId)) {
        return false;
      }

      this.player.skillPoints -= skill.cost;
      this.player.skills.push(skillId);
      this.recalculatePlayer(false);
      this.lastPlayedAt = Date.now();
      return true;
    },

    // Camp rest trades gold for a guaranteed refill between encounters.
    restAtCamp() {
      if (this.player.gold < CAMP_REST_COST) {
        return false;
      }

      this.player.gold -= CAMP_REST_COST;
      this.player.hp = this.player.maxHp;
      this.player.mp = this.player.maxMp;
      this.lastPlayedAt = Date.now();
      return true;
    },

    // Encounter tracking feeds the handbook even if the player loses the fight.
    markEnemyEncountered(enemyId) {
      if (!this.encounteredEnemies.includes(enemyId)) {
        this.encounteredEnemies.push(enemyId);
      }
    },

    // Wrong answers are deduplicated and promoted to the top of the review backlog.
    recordWrongQuestion(question) {
      const existing = this.player.wrongQuestions.find(
        (entry) => entry.id === question.id,
      );

      if (existing) {
        existing.count += 1;
        existing.lastSeenAt = Date.now();
        return;
      }

      this.player.wrongQuestions.unshift({
        id: question.id,
        prompt: question.prompt,
        answer: question.answer,
        explanation: question.explanation,
        chapterId: question.chapterId,
        count: 1,
        lastSeenAt: Date.now(),
      });

      this.player.wrongQuestions = this.player.wrongQuestions.slice(0, 16);
    },

    // Correct review or drill answers can remove a prompt from the backlog.
    resolveWrongQuestion(questionId) {
      const nextWrongQuestions = this.player.wrongQuestions.filter(
        (entry) => entry.id !== Number(questionId),
      );

      if (nextWrongQuestions.length === this.player.wrongQuestions.length) {
        return false;
      }

      this.player.wrongQuestions = nextWrongQuestions;
      this.lastPlayedAt = Date.now();
      return true;
    },

    // Battle milestones update achievement cards without mixing with reward logic.
    recordBattleMilestone({ enemyId, maxCombo = 0, perfectClear = false, enemyRole = "Scout" }) {
      this.achievements.totalVictories += 1;
      this.achievements.highestCombo = Math.max(
        this.achievements.highestCombo,
        maxCombo,
      );

      if (enemyRole === "Boss") {
        this.achievements.bossVictories += 1;
      }

      if (perfectClear && !this.achievements.flawlessEnemyIds.includes(enemyId)) {
        this.achievements.flawlessEnemyIds.push(enemyId);
      }
    },

    // Victory handles first-clear rewards, chapter unlocks, and any level-up fallout.
    applyVictory(enemyId, nextVitals = null) {
      const enemy = getEnemyById(enemyId);

      if (!enemy) {
        return {
          alreadyCleared: false,
          leveledUp: false,
          unlockedChapterId: null,
          rewardExp: 0,
          rewardGold: 0,
          rewardItemId: null,
          rewardSkillPoints: 0,
        };
      }

      if (nextVitals) {
        this.syncVitals(nextVitals.hp, nextVitals.mp);
      }

      const levelBefore = this.player.level;
      const firstClear = !this.clearedEnemies.includes(enemyId);
      let rewardExp = 0;
      let rewardGold = 0;
      let rewardItemId = null;
      let rewardSkillPoints = 0;
      let unlockedChapterId = null;

      if (firstClear) {
        this.clearedEnemies.push(enemyId);
        this.player.exp += enemy.rewardExp;
        this.player.gold += enemy.rewardGold;
        rewardExp = enemy.rewardExp;
        rewardGold = enemy.rewardGold;

        if (enemy.rewardItemId) {
          this.addItem(enemy.rewardItemId, 1);
          rewardItemId = enemy.rewardItemId;
        }

        if (enemy.role === "Boss") {
          this.player.skillPoints += 1;
          rewardSkillPoints += 1;
        }

        const chapter = getChapterById(enemy.chapterId);
        const chapterCleared =
          chapter &&
          chapter.enemyIds.every((chapterEnemyId) =>
            this.clearedEnemies.includes(chapterEnemyId),
          );

        if (chapterCleared) {
          const nextChapter = chapters.find(
            (chapterEntry) => chapterEntry.id === enemy.chapterId + 1,
          );

          if (
            nextChapter &&
            !this.player.unlockedChapters.includes(nextChapter.id)
          ) {
            this.player.unlockedChapters.push(nextChapter.id);
            unlockedChapterId = nextChapter.id;
          }
        }
      }

      const nextLevel = getLevelFromExp(this.player.exp);
      const gainedLevels = Math.max(0, nextLevel - levelBefore);

      if (gainedLevels > 0) {
        this.player.skillPoints += gainedLevels;
        rewardSkillPoints += gainedLevels;
      }

      this.started = true;
      this.lastPlayedAt = Date.now();
      this.recalculatePlayer(gainedLevels > 0);

      return {
        alreadyCleared: !firstClear,
        leveledUp: gainedLevels > 0,
        unlockedChapterId,
        rewardExp,
        rewardGold,
        rewardItemId,
        rewardSkillPoints,
      };
    },

    // Defeat leaves the player wounded but always able to continue the run.
    applyDefeat(nextVitals = null) {
      if (nextVitals) {
        this.syncVitals(nextVitals.hp, nextVitals.mp);
      }

      this.player.hp = Math.max(this.player.hp, Math.ceil(this.player.maxHp * 0.35));
      this.player.mp = Math.max(this.player.mp, Math.ceil(this.player.maxMp * 0.25));
      this.started = true;
      this.lastPlayedAt = Date.now();

      return {
        recoveryHp: this.player.hp,
        recoveryMp: this.player.mp,
      };
    },
  },
});
