import { defineStore } from "pinia";

import { chapters, getChapterById } from "../data/chapters";
import { enemies, getEnemyById } from "../data/enemies";
import { getItemById } from "../data/items";
import { getSkillById } from "../data/skills";
import { getLevelFromExp, getNextLevelExp, getStatsForLevel } from "../utils/level";
import { clearGameSave, loadGame, saveGame } from "../utils/save";

const CAMP_REST_COST = 14;

// 小型属性工具函数用于把等级、装备和技能加成统一组合。
function createStatBlock() {
  return {
    maxHp: 0,
    maxMp: 0,
    attack: 0,
    defense: 0,
  };
}

// 把多种属性来源合并成最终可用于战斗的面板值。
function mergeStatBlocks(base, bonus = {}) {
  return {
    maxHp: base.maxHp + (bonus.maxHp ?? 0),
    maxMp: base.maxMp + (bonus.maxMp ?? 0),
    attack: base.attack + (bonus.attack ?? 0),
    defense: base.defense + (bonus.defense ?? 0),
  };
}

// 老存档里背包结构可能不同，因此先做一次统一格式化。
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

// 兼容旧版本里以数组形式保存的装备数据。
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

// 过滤旧存档或手工编辑存档里无效的技能 id。
function normalizeSkillIds(skillIds) {
  if (!Array.isArray(skillIds)) {
    return [];
  }

  return [...new Set(skillIds.filter((skillId) => getSkillById(skillId)))];
}

// 每次重算玩家属性时，都要重新累加装备加成。
function collectEquipmentBonus(player) {
  return Object.values(player.equippedItems ?? {}).reduce((bonus, itemId) => {
    const item = getItemById(itemId);

    if (!item?.stats) {
      return bonus;
    }

    return mergeStatBlocks(bonus, item.stats);
  }, createStatBlock());
}

// 已学会的被动技能会走与装备相同的属性结算链路。
function collectSkillBonus(player) {
  return player.skills.reduce((bonus, skillId) => {
    const skill = getSkillById(skillId);

    if (!skill?.stats) {
      return bonus;
    }

    return mergeStatBlocks(bonus, skill.stats);
  }, createStatBlock());
}

// 创建默认玩家，并让初始装备在开局就处于穿戴状态。
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
    name: "前端勇者",
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

// 根状态同时保存当前进度和长期成就数据。
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

// 把旧存档并入当前数据结构，同时保留安全兜底值。
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
    // 只要有可恢复的有效状态，这一局就算有进度。
    hasProgress: (state) =>
      state.started ||
      state.clearedEnemies.length > 0 ||
      state.encounteredEnemies.length > 0 ||
      state.lastPlayedAt !== null,

    // 地图和顶部面板都会用这个值展示下一次升级门槛。
    nextLevelExp: (state) => getNextLevelExp(state.player.level),

    // 章节卡通过这里读取局部进度，避免重复写逻辑。
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

    // 侧栏复盘板只展示最近的几道错题。
    recentWrongQuestions: (state) => state.player.wrongQuestions.slice(0, 4),

    // 统计完全通关的章节数量，供地图和里程碑使用。
    clearedChaptersCount: (state) =>
      chapters.filter((chapter) =>
        chapter.enemyIds.every((enemyId) => state.clearedEnemies.includes(enemyId)),
      ).length,

    // 为玩家指出当前最值得推进的下一章。
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

    // 根据当前最关键的章节生成任务看板主标题。
    activeQuest() {
      const targetChapter = this.nextTargetChapter;

      if (!targetChapter) {
        return {
          title: "世界已暂时恢复秩序",
          description: "当前可见章节都已通关，是时候继续扩展这片前端大陆了。",
          progressLabel: `${this.clearedChaptersCount}/${chapters.length} 章`,
        };
      }

      const progress = this.chapterProgress(targetChapter.id);
      const unlocked = this.player.unlockedChapters.includes(targetChapter.id);

      if (unlocked) {
        return {
          title: `通关 ${targetChapter.title}`,
          description: targetChapter.storyBeat,
          progressLabel: `${progress.cleared}/${progress.total} 场遭遇`,
        };
      }

      const previousChapter = chapters.find(
        (chapter) => chapter.id === targetChapter.id - 1,
      );
      const previousProgress = previousChapter
        ? this.chapterProgress(previousChapter.id)
        : { cleared: 0, total: 0 };

      return {
        title: `解锁 ${targetChapter.title}`,
        description: `先完成${previousChapter?.title ?? "当前边境"}，下一条道路才会开启。`,
        progressLabel: `${previousProgress.cleared}/${previousProgress.total} 场前置遭遇`,
      };
    },

    // 任务看板清单尽量短，并且每一条都能直接行动。
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
          title: "前线",
          body: targetChapter
            ? `${targetChapter.title} 就是你当前的主要推进目标。`
            : "当前已设计的所有前线都已经打通。",
        },
        {
          title: "首领目标",
          body: nextBoss
            ? `${nextBoss.name} 仍然挡在前进路线的尽头。`
            : "当前没有正在阻挡道路的首领，可以继续推进新章节或返场练习。",
        },
        {
          title: "复习",
          body:
            this.recentWrongQuestions.length > 0
              ? `图鉴里还有 ${this.recentWrongQuestions.length} 道最近错题在等你回头复盘。`
              : "最近的答题记录很干净。",
        },
      ];
    },

    // 里程碑提供了章节通关之外的长期目标。
    milestoneCards() {
      return [
        {
          title: "初战告捷",
          unlocked: this.achievements.totalVictories >= 1,
          progressLabel: `${Math.min(this.achievements.totalVictories, 1)}/1`,
          body: "赢下你在前端大陆上的第一场试炼。",
        },
        {
          title: "首领终结者",
          unlocked: this.achievements.bossVictories >= 3,
          progressLabel: `${this.achievements.bossVictories}/3`,
          body: "击败 3 个章节首领。",
        },
        {
          title: "完美路线",
          unlocked: this.achievements.flawlessEnemyIds.length >= 1,
          progressLabel: `${this.achievements.flawlessEnemyIds.length}/1`,
          body: "在任意一场遭遇战中做到全程无错。",
        },
        {
          title: "连击学者",
          unlocked: this.achievements.highestCombo >= 4,
          progressLabel: `${this.achievements.highestCombo}/4`,
          body: "连续答对 4 题，打出一段连击。",
        },
        {
          title: "大陆绘图师",
          unlocked: this.clearedChaptersCount >= chapters.length,
          progressLabel: `${this.clearedChaptersCount}/${chapters.length}`,
          body: "完整通关当前地图上所有可见章节。",
        },
        {
          title: "状态主宰者",
          unlocked: this.clearedEnemies.includes(702),
          progressLabel: this.clearedEnemies.includes(702) ? "已完成" : "未完成",
          body: "在最终神殿中击败状态混乱魔王。",
        },
      ];
    },

    // 技能必须同时满足等级、章节和前置要求才能解锁。
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

    // 背包页面按道具 id 查询堆叠数量。
    itemQuantity: (state) => (itemId) =>
      state.player.inventory.find((entry) => entry.itemId === itemId)?.quantity ?? 0,
  },

  actions: {
    // 启动时恢复存档，并兼容旧版本数据结构。
    hydrateFromSave() {
      const savedState = loadGame();

      if (!savedState) {
        return;
      }

      this.$patch(mergeSavedState(savedState));
      this.recalculatePlayer(false);
    },

    // 自动存档只注册一次，之后所有变更都会同步到浏览器本地存储。
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

    // 开始新游戏时重置整局进度，但保留当前版本规则。
    startNewGame() {
      this.$patch(createFreshState());
      this.started = true;
      this.lastPlayedAt = Date.now();
      this.recalculatePlayer(true);
    },

    // 彻底重置整局进度，用于地图页的重开操作。
    resetGame() {
      this.$patch(createFreshState());
      clearGameSave();
    },

    // 经验、装备或技能变化时，都要重建玩家属性面板。
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

    // 把战斗结束时的血量和法力同步回主进度。
    syncVitals(nextHp, nextMp) {
      this.player.hp = Math.max(0, Math.min(Math.round(nextHp), this.player.maxHp));
      this.player.mp = Math.max(0, Math.min(Math.round(nextMp), this.player.maxMp));
      this.lastPlayedAt = Date.now();
    },

    // 消耗品和营地休息都会走这条统一恢复逻辑。
    healPlayer(effect = {}) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + (effect.hp ?? 0));
      this.player.mp = Math.min(this.player.maxMp, this.player.mp + (effect.mp ?? 0));
      this.lastPlayedAt = Date.now();
    },

    // 奖励和掉落都通过这条背包写入路径进入存档。
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

    // 消耗品立即生效，然后扣减对应堆叠数量。
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

    // 再次装备同一件物品会视为卸下，形成切换行为。
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

    // 解锁技能会永久修改属性面板，并消耗技能点。
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

    // 营地休息用金币换取稳定的满状态恢复。
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

    // 即使战斗失败，只要遇到过敌人，也会写入图鉴遭遇记录。
    markEnemyEncountered(enemyId) {
      if (!this.encounteredEnemies.includes(enemyId)) {
        this.encounteredEnemies.push(enemyId);
      }
    },

    // 错题会去重，并被推到错题本最前面。
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

    // 在复盘或训练里答对后，可以把对应题目从错题本移除。
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

    // 战斗里程碑只负责更新成就，不和奖励结算混在一起。
    recordBattleMilestone({ enemyId, maxCombo = 0, perfectClear = false, enemyRole = "小怪" }) {
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

    // 胜利结算负责处理首通奖励、章节解锁和升级收益。
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

    // 失败后会保留一定恢复量，确保这局游戏还能继续推进。
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
