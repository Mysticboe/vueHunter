import { defineStore } from "pinia";

import { getEnemyById } from "../data/enemies";
import { getQuestionsByIds } from "../data/questions";
import { calcDamage } from "../utils/calcDamage";
import { useGameStore } from "./game";

// 不同题型会略微影响伤害倍率，让代码题更有爆发感。
const QUESTION_DAMAGE_SCALE = {
  single: 1,
  judge: 0.92,
  code: 1.22,
};

// 战斗状态按遭遇重置，不直接写入长期存档。
function createBattleState() {
  return {
    status: "idle",
    enemy: null,
    enemyHp: 0,
    playerSnapshot: null,
    currentQuestion: null,
    selectedAction: "attack",
    usedQuestionIds: [],
    turn: 1,
    pendingGuard: 0,
    comboStreak: 0,
    maxCombo: 0,
    wrongAnswerCount: 0,
    bossPhase: 0,
    bossPhaseTriggered: false,
    lastOutcome: null,
    battleResult: null,
    log: [],
  };
}

// 根据题型读取对应的伤害倍率。
function getQuestionScale(questionType) {
  return QUESTION_DAMAGE_SCALE[questionType] ?? 1;
}

// 敌人意图文案会在界面上展示下一次反击倾向。
function getEnemyIntent(enemy, bossPhase, turn) {
  if (!enemy) {
    return null;
  }

  if (enemy.role !== "Boss") {
    return turn % 2 === 0 ? "蓄力反击" : "标准攻击";
  }

  if (bossPhase < 2) {
    return turn % 2 === 0 ? "试探施压" : "破防重击";
  }

  return turn % 2 === 0 ? "过载连击" : "狂怒斩击";
}

// 战斗评级由正确率、连击表现和首领阶段处理共同决定。
function buildBattleRank({ isBossBattle, perfectClear, maxCombo, bossPhaseTriggered }) {
  if (perfectClear && maxCombo >= 4) {
    return "S";
  }

  if (perfectClear || (isBossBattle && bossPhaseTriggered && maxCombo >= 3)) {
    return "A";
  }

  if (maxCombo >= 2) {
    return "B";
  }

  return "C";
}

export const useBattleStore = defineStore("battle", {
  state: () => createBattleState(),

  getters: {
    // 目前版本里，技能攻击统一消耗固定 MP。
    canUseSkill: (state) => state.playerSnapshot?.mp >= 10,
    isBossBattle: (state) => state.enemy?.role === "Boss",
    // 界面会把敌人意图当成回合提示显示出来。
    enemyIntent: (state) => getEnemyIntent(state.enemy, state.bossPhase, state.turn),
  },

  actions: {
    // 离开战斗或开启新遭遇时，重置整份临时战斗状态。
    resetBattle() {
      this.$patch(createBattleState());
    },

    // 根据敌人数据和当前玩家面板初始化一场战斗。
    startBattle(enemyId) {
      const gameStore = useGameStore();
      const enemy = getEnemyById(enemyId);

      if (!enemy) {
        this.resetBattle();
        return false;
      }

      gameStore.markEnemyEncountered(enemyId);

      this.enemy = { ...enemy };
      this.enemyHp = enemy.maxHp;
      this.playerSnapshot = {
        name: gameStore.player.name,
        level: gameStore.player.level,
        hp: gameStore.player.hp,
        maxHp: gameStore.player.maxHp,
        mp: gameStore.player.mp,
        maxMp: gameStore.player.maxMp,
        attack: gameStore.player.attack,
        defense: gameStore.player.defense,
      };
      this.status = "in_progress";
      this.turn = 1;
      this.selectedAction = "attack";
      this.pendingGuard = 0;
      this.comboStreak = 0;
      this.maxCombo = 0;
      this.wrongAnswerCount = 0;
      this.bossPhase = enemy.role === "Boss" ? 1 : 0;
      this.bossPhaseTriggered = false;
      this.usedQuestionIds = [];
      this.lastOutcome = null;
      this.battleResult = null;
      this.log = [
        `意图：${getEnemyIntent(enemy, this.bossPhase, this.turn)}。`,
        `${enemy.name} 挡在了前进的道路上。`,
      ];
      this.drawQuestion();

      return true;
    },

    // 中途离开战斗时，也要保留当前血蓝变化。
    commitProgressOnExit() {
      if (!this.playerSnapshot || !["in_progress", "resolved"].includes(this.status)) {
        return;
      }

      const gameStore = useGameStore();
      gameStore.syncVitals(this.playerSnapshot.hp, this.playerSnapshot.mp);
    },

    // 只有在等待答题时，玩家才允许切换行动。
    setSelectedAction(action) {
      if (this.status !== "in_progress") {
        return;
      }

      if (action === "skill" && !this.canUseSkill) {
        return;
      }

      this.selectedAction = action;
    },

    // 本地题池未用尽前，尽量避免重复抽题。
    drawQuestion() {
      if (!this.enemy) {
        this.currentQuestion = null;
        return;
      }

      const pool = getQuestionsByIds(this.enemy.questionPool);
      const unseenQuestions = pool.filter(
        (question) => !this.usedQuestionIds.includes(question.id),
      );
      const selectionPool = unseenQuestions.length > 0 ? unseenQuestions : pool;

      if (selectionPool.length === 0) {
        this.currentQuestion = null;
        return;
      }

      const nextQuestion =
        selectionPool[Math.floor(Math.random() * selectionPool.length)];

      if (!this.usedQuestionIds.includes(nextQuestion.id)) {
        this.usedQuestionIds.push(nextQuestion.id);
      }

      this.currentQuestion = nextQuestion;
    },

    // 首领掉到半血以下时会触发一次性的阶段切换。
    maybeTriggerBossPhase() {
      if (!this.enemy || this.enemy.role !== "Boss" || this.bossPhaseTriggered) {
        return null;
      }

      const phaseThreshold = Math.ceil(this.enemy.maxHp * 0.5);

      if (this.enemyHp > phaseThreshold) {
        return null;
      }

      this.bossPhase = 2;
      this.bossPhaseTriggered = true;

      const restoredHp = Math.max(12, Math.round(this.enemy.maxHp * 0.18));
      this.enemyHp = Math.min(this.enemy.maxHp, this.enemyHp + restoredHp);

      const phaseLine = `${this.enemy.name} 进入第二阶段，恢复了 ${restoredHp} 点 HP，并改变了攻击节奏。`;
      this.log.unshift(phaseLine);
      this.log = this.log.slice(0, 10);

      return phaseLine;
    },

    // 一次答题会同时结算玩家行动、敌人反击和本回合结果。
    submitAnswer(option) {
      if (
        this.status !== "in_progress" ||
        !this.currentQuestion ||
        !this.playerSnapshot ||
        !this.enemy
      ) {
        return;
      }

      const gameStore = useGameStore();
      const correct = option === this.currentQuestion.answer;
      const questionScale = getQuestionScale(this.currentQuestion.type);
      const nextCombo = correct ? this.comboStreak + 1 : 0;
      const comboBonus = correct
        ? 1 + Math.min(Math.max(0, nextCombo - 1), 3) * 0.08
        : 1;
      // 如果 MP 不足，技能会自动降级成普通攻击。
      let enemyIntent = getEnemyIntent(this.enemy, this.bossPhase, this.turn);
      let action = this.selectedAction;
      let playerDamage = 0;
      let enemyDamage = 0;
      let effectLine = "";

      if (!correct) {
        this.wrongAnswerCount += 1;
      }

      if (action === "skill" && !this.canUseSkill) {
        action = "attack";
      }

      if (action === "skill") {
        this.playerSnapshot.mp -= 10;
      }

      if (correct) {
        if (action === "attack") {
          playerDamage = calcDamage(
            this.playerSnapshot.attack,
            this.enemy.defense,
            1.05 * questionScale * comboBonus,
          );
          effectLine =
            nextCombo >= 3
              ? "回答正确，普通攻击延续了连击。"
              : "回答正确，普通攻击命中。";
        }

        if (action === "skill") {
          playerDamage = calcDamage(
            this.playerSnapshot.attack,
            this.enemy.defense,
            1.65 * questionScale * comboBonus,
          );
          effectLine =
            this.currentQuestion.type === "code"
              ? "代码题回答正确，Vue 爆发打出了暴击。"
              : "回答正确，Vue 爆发造成了额外伤害。";
        }

        if (action === "guard") {
          this.pendingGuard = this.currentQuestion.type === "judge" ? 0.72 : 0.6;
          this.playerSnapshot.mp = Math.min(
            this.playerSnapshot.maxMp,
            this.playerSnapshot.mp + 6,
          );
          effectLine =
            nextCombo >= 2
              ? "回答正确，调试防御保住了连击并削弱了下一次受击。"
              : "回答正确，调试防御减轻了敌人的反击。";
        }
      } else {
        if (action === "guard") {
          this.pendingGuard = 0.25;
          effectLine = "回答错误，但你的防御仍然替你挡掉了一部分伤害。";
        } else {
          effectLine = "回答错误，攻击在命中前就已经失效了。";
        }

        gameStore.recordWrongQuestion(this.currentQuestion);
      }

      this.comboStreak = nextCombo;
      this.maxCombo = Math.max(this.maxCombo, nextCombo);

      // 首领二阶段会降低玩家造成的伤害，让阶段差异更明显。
      if (playerDamage > 0 && this.enemy.role === "Boss" && this.bossPhase === 2) {
        playerDamage = Math.max(3, Math.round(playerDamage * 0.82));
      }

      if (playerDamage > 0) {
        this.enemyHp = Math.max(0, this.enemyHp - playerDamage);
      }

      const phaseLine = this.maybeTriggerBossPhase();

      if (phaseLine) {
        effectLine = `${effectLine} ${phaseLine}`;
        enemyIntent = getEnemyIntent(this.enemy, this.bossPhase, this.turn);
      }

      if (this.enemyHp <= 0) {
        const rewards = gameStore.applyVictory(this.enemy.id, {
          hp: this.playerSnapshot.hp,
          mp: this.playerSnapshot.mp,
        });
        const perfectClear = this.wrongAnswerCount === 0;
        const rank = buildBattleRank({
          isBossBattle: this.enemy.role === "Boss",
          perfectClear,
          maxCombo: this.maxCombo,
          bossPhaseTriggered: this.bossPhaseTriggered,
        });

        if (!rewards.alreadyCleared) {
          gameStore.recordBattleMilestone({
            enemyId: this.enemy.id,
            maxCombo: this.maxCombo,
            perfectClear,
            enemyRole: this.enemy.role,
          });
        }

        this.status = "victory";
        this.battleResult = {
          ...rewards,
          rank,
          perfectClear,
          maxCombo: this.maxCombo,
          title: "胜利",
          message: rewards.alreadyCleared
            ? "这场遭遇已经通关过了，所以这次只会算作练习。"
            : "怪物化作知识碎片和战利品消散了。",
        };
        this.lastOutcome = {
          correct,
          choice: option,
          action,
          playerDamage,
          enemyDamage: 0,
          explanation: this.currentQuestion.explanation,
          effectLine,
          comboStreak: this.comboStreak,
        };
        this.log.unshift(effectLine);
        this.log = this.log.slice(0, 10);
        return;
      }

      // 防御影响的是敌人的反击，不是当前玩家出手。
      let enemyScale = 1 - this.pendingGuard;
      let enemyAttack = this.enemy.attack;

      if (this.enemy.role === "Boss" && this.bossPhase === 1 && this.turn % 2 === 0) {
        enemyScale *= 1.12;
      }

      if (this.enemy.role === "Boss" && this.bossPhase === 2) {
        enemyAttack += 4;
        enemyScale *= this.turn % 2 === 0 ? 1.55 : 1.2;
      }

      enemyDamage = calcDamage(
        enemyAttack,
        this.playerSnapshot.defense,
        enemyScale,
      );
      this.playerSnapshot.hp = Math.max(0, this.playerSnapshot.hp - enemyDamage);
      this.pendingGuard = 0;

      if (this.playerSnapshot.hp <= 0) {
        const defeatState = gameStore.applyDefeat({
          hp: this.playerSnapshot.hp,
          mp: this.playerSnapshot.mp,
        });

        this.status = "defeat";
        this.battleResult = {
          title: "败退",
          message:
            "这一次是题目赢了。你会在营地恢复一部分状态，然后从地图重新整备。",
          rank: "重试",
          maxCombo: this.maxCombo,
          ...defeatState,
        };
      } else {
        gameStore.syncVitals(this.playerSnapshot.hp, this.playerSnapshot.mp);
        this.status = "resolved";
      }

      this.lastOutcome = {
        correct,
        choice: option,
        action,
        playerDamage,
        enemyDamage,
        explanation: this.currentQuestion.explanation,
        effectLine,
        comboStreak: this.comboStreak,
      };

      this.log.unshift(`${this.enemy.name} 发动了${enemyIntent}，造成 ${enemyDamage} 点伤害。`);
      this.log.unshift(effectLine);
      this.log = this.log.slice(0, 10);
    },

    // 玩家读完结果后，才允许正式进入下一回合。
    advanceTurn() {
      if (this.status !== "resolved") {
        return;
      }

      this.turn += 1;
      this.selectedAction = "attack";
      this.lastOutcome = null;
      this.status = "in_progress";
      this.drawQuestion();

      if (this.enemy) {
        this.log.unshift(
          `意图：${getEnemyIntent(this.enemy, this.bossPhase, this.turn)}。`,
        );
        this.log = this.log.slice(0, 10);
      }
    },
  },
});
