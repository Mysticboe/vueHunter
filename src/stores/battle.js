import { defineStore } from "pinia";

import { getEnemyById } from "../data/enemies";
import { getQuestionsByIds } from "../data/questions";
import { calcDamage } from "../utils/calcDamage";
import { useGameStore } from "./game";

// Different prompt types slightly shift damage so code questions feel punchier.
const QUESTION_DAMAGE_SCALE = {
  single: 1,
  judge: 0.92,
  code: 1.22,
};

// Battle state is reset per encounter and never persisted directly.
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

// Resolve the damage multiplier from the active prompt type.
function getQuestionScale(questionType) {
  return QUESTION_DAMAGE_SCALE[questionType] ?? 1;
}

// Enemy intent text gives the UI a readable preview of the next counterattack.
function getEnemyIntent(enemy, bossPhase, turn) {
  if (!enemy) {
    return null;
  }

  if (enemy.role !== "Boss") {
    return turn % 2 === 0 ? "Measured counterattack" : "Standard strike";
  }

  if (bossPhase < 2) {
    return turn % 2 === 0 ? "Scripted probe" : "Guard break";
  }

  return turn % 2 === 0 ? "Overload barrage" : "Enraged strike";
}

// End-of-fight rank is based on cleanliness, combo skill, and boss handling.
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
    // Skill attacks cost a flat amount of MP in the MVP.
    canUseSkill: (state) => state.playerSnapshot?.mp >= 10,
    isBossBattle: (state) => state.enemy?.role === "Boss",
    // The UI shows intent as a computed read-only battle hint.
    enemyIntent: (state) => getEnemyIntent(state.enemy, state.bossPhase, state.turn),
  },

  actions: {
    // Reset is called when leaving battle routes or starting a new encounter.
    resetBattle() {
      this.$patch(createBattleState());
    },

    // Initialize one encounter from enemy data plus the current persistent player sheet.
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
        `Intent: ${getEnemyIntent(enemy, this.bossPhase, this.turn)}.`,
        `${enemy.name} blocks the road.`,
      ];
      this.drawQuestion();

      return true;
    },

    // If the player leaves mid-fight, keep the current HP and MP changes.
    commitProgressOnExit() {
      if (!this.playerSnapshot || !["in_progress", "resolved"].includes(this.status)) {
        return;
      }

      const gameStore = useGameStore();
      gameStore.syncVitals(this.playerSnapshot.hp, this.playerSnapshot.mp);
    },

    // Action selection is only mutable while waiting for an answer.
    setSelectedAction(action) {
      if (this.status !== "in_progress") {
        return;
      }

      if (action === "skill" && !this.canUseSkill) {
        return;
      }

      this.selectedAction = action;
    },

    // Draw a question without repeating until the local encounter pool is exhausted.
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

    // Bosses gain a one-time phase shift once they drop below half health.
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

      const phaseLine = `${this.enemy.name} enters Phase 2, restores ${restoredHp} HP, and sharpens its pattern.`;
      this.log.unshift(phaseLine);
      this.log = this.log.slice(0, 10);

      return phaseLine;
    },

    // One submitted answer resolves the player action, enemy counter, and result state.
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
      // Action can still downgrade to a basic attack if MP ran out between turns.
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
              ? "Correct answer. Basic Strike extends the combo."
              : "Correct answer. Basic Strike lands cleanly.";
        }

        if (action === "skill") {
          playerDamage = calcDamage(
            this.playerSnapshot.attack,
            this.enemy.defense,
            1.65 * questionScale * comboBonus,
          );
          effectLine =
            this.currentQuestion.type === "code"
              ? "Correct code fill. Vue Burst lands a critical hit."
              : "Correct answer. Vue Burst hits for bonus damage.";
        }

        if (action === "guard") {
          this.pendingGuard = this.currentQuestion.type === "judge" ? 0.72 : 0.6;
          this.playerSnapshot.mp = Math.min(
            this.playerSnapshot.maxMp,
            this.playerSnapshot.mp + 6,
          );
          effectLine =
            nextCombo >= 2
              ? "Correct answer. Debug Guard holds the combo and softens the hit."
              : "Correct answer. Debug Guard softens the counterattack.";
        }
      } else {
        if (action === "guard") {
          this.pendingGuard = 0.25;
          effectLine =
            "Wrong answer. Your guard still takes the edge off the next hit.";
        } else {
          effectLine = "Wrong answer. The attack fizzles before it connects.";
        }

        gameStore.recordWrongQuestion(this.currentQuestion);
      }

      this.comboStreak = nextCombo;
      this.maxCombo = Math.max(this.maxCombo, nextCombo);

      // Boss phase 2 reduces incoming player damage so the fight feels more distinct.
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
          title: "Victory",
          message: rewards.alreadyCleared
            ? "This encounter was already cleared, so this run counts as practice."
            : "The monster dissolves into study notes and loot.",
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

      // Guard modifies the next retaliation rather than the current attack itself.
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
          title: "Retreat",
          message:
            "The lesson wins this time. You recover a little at camp and can regroup from the map.",
          rank: "Retry",
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

      this.log.unshift(`${this.enemy.name} uses ${enemyIntent} for ${enemyDamage} damage.`);
      this.log.unshift(effectLine);
      this.log = this.log.slice(0, 10);
    },

    // Advance to the next turn only after the player has read the previous outcome.
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
          `Intent: ${getEnemyIntent(this.enemy, this.bossPhase, this.turn)}.`,
        );
        this.log = this.log.slice(0, 10);
      }
    },
  },
});
