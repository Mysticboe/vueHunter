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

// 敌方技能名按章节和阶段切换，让每个区域的反击都更有辨识度。
const ENEMY_SKILL_BOOK = {
  1: {
    normal: ["插值黏液喷射", "指令扰动"],
    bossPhaseOne: ["模板束缚", "条件翻转"],
    bossPhaseTwo: ["循环风暴", "事件乱流"],
  },
  2: {
    normal: ["值窃脉冲", "响应撞击"],
    bossPhaseOne: ["依赖压制", "代理震荡"],
    bossPhaseTwo: ["响应坍缩", "值域过载"],
  },
  3: {
    normal: ["推导凝视", "监听尖啸"],
    bossPhaseOne: ["副作用咒缚", "依赖回响"],
    bossPhaseTwo: ["监听风暴", "失控推导"],
  },
  4: {
    normal: ["断链冲撞", "插槽吞噬"],
    bossPhaseOne: ["属性封锁", "事件失联"],
    bossPhaseTwo: ["通信暴潮", "插槽崩坏"],
  },
  5: {
    normal: ["组合折射", "逻辑抽离"],
    bossPhaseOne: ["重复回环", "Setup 压制"],
    bossPhaseTwo: ["复用失衡", "组合风暴"],
  },
  6: {
    normal: ["路径偏折", "参数缠绕"],
    bossPhaseOne: ["守卫盘查", "动态迷航"],
    bossPhaseTwo: ["路径折叠", "导航封锁"],
  },
  7: {
    normal: ["状态涟漪", "共享侵蚀"],
    bossPhaseOne: ["Action 封锁", "状态错乱"],
    bossPhaseTwo: ["全局过载", "状态回收"],
  },
};

// 首领机制统一收敛成几类状态，方便界面展示和后续继续扩展。
function createBossEffects() {
  return {
    enemyBarrier: 0,
    playerDamageDown: 0,
    skillLocked: false,
    guardBreak: false,
  };
}

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
    bossEffects: createBossEffects(),
    lastOutcome: null,
    battleResult: null,
    log: [],
  };
}

// 根据题型读取对应的伤害倍率。
function getQuestionScale(questionType) {
  return QUESTION_DAMAGE_SCALE[questionType] ?? 1;
}

// 技能名和敌人意图解耦，这样界面可以同时显示“招式名”和“攻击倾向”。
function getEnemySkillName(enemy, bossPhase, turn) {
  if (!enemy) {
    return null;
  }

  const skillBook = ENEMY_SKILL_BOOK[enemy.chapterId] ?? ENEMY_SKILL_BOOK[1];
  const rotation =
    enemy.role !== "Boss"
      ? skillBook.normal
      : bossPhase < 2
        ? skillBook.bossPhaseOne
        : skillBook.bossPhaseTwo;

  return rotation[turn % 2 === 0 ? 1 : 0] ?? rotation[0] ?? "失控反击";
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

// 同一套计算会被预警面板和实际受击结算复用，保证展示与结果一致。
function getEnemyCounterProfile(enemy, playerSnapshot, bossPhase, turn, guardRate = 0) {
  if (!enemy || !playerSnapshot) {
    return null;
  }

  let enemyScale = 1 - guardRate;
  let enemyAttack = enemy.attack;

  if (enemy.role === "Boss" && bossPhase === 1 && turn % 2 === 0) {
    enemyScale *= 1.12;
  }

  if (enemy.role === "Boss" && bossPhase === 2) {
    enemyAttack += 4;
    enemyScale *= turn % 2 === 0 ? 1.55 : 1.2;
  }

  return {
    attack: enemyAttack,
    scale: enemyScale,
    damage: calcDamage(enemyAttack, playerSnapshot.defense, enemyScale),
  };
}

// 威胁等级会综合伤害量和玩家血量，让提示更贴近真实危险度。
function buildThreatMeta(damage, maxHp, isBossBattle) {
  const safeMaxHp = Math.max(maxHp ?? 0, 1);
  const ratio = damage / safeMaxHp;

  if (ratio >= 0.32 || damage >= (isBossBattle ? 34 : 26)) {
    return {
      label: "极高",
      tone: "critical",
    };
  }

  if (ratio >= 0.22 || damage >= (isBossBattle ? 24 : 18)) {
    return {
      label: "高",
      tone: "high",
    };
  }

  if (ratio >= 0.12 || damage >= 10) {
    return {
      label: "中",
      tone: "mid",
    };
  }

  return {
    label: "低",
    tone: "low",
  };
}

// 首领技能会在当前回合结束后附带额外效果，逼迫玩家调整下一回合策略。
function applyBossAftershock(enemy, bossPhase, skillName, playerSnapshot, bossEffects) {
  if (!enemy || enemy.role !== "Boss" || !playerSnapshot) {
    return null;
  }

  switch (enemy.chapterId) {
    case 1: {
      const barrier = bossPhase >= 2 ? 12 : 8;
      bossEffects.enemyBarrier = barrier;
      return `${skillName} 留下了模板护幕，首领下回合会先吸收 ${barrier} 点伤害。`;
    }
    case 2: {
      const mpDrain = Math.min(playerSnapshot.mp, bossPhase >= 2 ? 8 : 6);
      playerSnapshot.mp -= mpDrain;
      bossEffects.skillLocked = true;
      return `${skillName} 扰乱了响应回路，抽走 ${mpDrain} 点 MP，并封锁了下回合的 Vue 爆发。`;
    }
    case 3: {
      const reduction = bossPhase >= 2 ? 0.32 : 0.24;
      bossEffects.playerDamageDown = reduction;
      return `${skillName} 扭曲了依赖链，你下次造成的伤害会降低 ${Math.round(reduction * 100)}%。`;
    }
    case 4: {
      const barrier = bossPhase >= 2 ? 10 : 7;
      bossEffects.enemyBarrier = barrier;
      bossEffects.guardBreak = true;
      return `${skillName} 切断了通信链路，首领获得 ${barrier} 点护幕，且下回合调试防御几乎无效。`;
    }
    case 5: {
      const reduction = bossPhase >= 2 ? 0.28 : 0.2;
      bossEffects.playerDamageDown = reduction;

      if (bossPhase >= 2) {
        bossEffects.skillLocked = true;
        return `${skillName} 让逻辑复用彻底失衡，下回合伤害降低 ${Math.round(reduction * 100)}%，Vue 爆发也会被压制。`;
      }

      return `${skillName} 打乱了你的 composable 节奏，下回合伤害降低 ${Math.round(reduction * 100)}%。`;
    }
    case 6: {
      bossEffects.guardBreak = true;

      if (bossPhase >= 2) {
        bossEffects.enemyBarrier = 8;
        return `${skillName} 折叠了退路，下回合调试防御几乎无效，且首领会先吸收 8 点伤害。`;
      }

      return `${skillName} 锁死了退路，下回合调试防御几乎无效。`;
    }
    case 7: {
      const mpDrain = Math.min(playerSnapshot.mp, bossPhase >= 2 ? 10 : 6);
      playerSnapshot.mp -= mpDrain;
      bossEffects.skillLocked = true;

      if (bossPhase >= 2) {
        bossEffects.playerDamageDown = 0.2;
        return `${skillName} 扭曲了全局状态，抽走 ${mpDrain} 点 MP，下回合无法施放 Vue 爆发，且伤害降低 20%。`;
      }

      return `${skillName} 搅乱了状态流，抽走 ${mpDrain} 点 MP，并封锁了下回合的 Vue 爆发。`;
    }
    default:
      return null;
  }
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
    canUseSkill: (state) => state.playerSnapshot?.mp >= 10 && !state.bossEffects.skillLocked,
    isBossBattle: (state) => state.enemy?.role === "Boss",
    // 界面会把敌人意图当成回合提示显示出来。
    enemyIntent: (state) => getEnemyIntent(state.enemy, state.bossPhase, state.turn),
    // 战术预警面板依赖这里生成统一的技能、威胁和承伤预测。
    enemyPreview: (state) => {
      const rawProfile = getEnemyCounterProfile(
        state.enemy,
        state.playerSnapshot,
        state.bossPhase,
        state.turn,
        0,
      );

      if (!rawProfile || !state.enemy || !state.playerSnapshot) {
        return null;
      }

      const successGuardRate = state.bossEffects.guardBreak
        ? 0.25
        : state.currentQuestion?.type === "judge"
          ? 0.72
          : 0.6;
      const guardedProfile = getEnemyCounterProfile(
        state.enemy,
        state.playerSnapshot,
        state.bossPhase,
        state.turn,
        successGuardRate,
      );
      const failedGuardProfile = getEnemyCounterProfile(
        state.enemy,
        state.playerSnapshot,
        state.bossPhase,
        state.turn,
        0.25,
      );
      const threat = buildThreatMeta(
        rawProfile.damage,
        state.playerSnapshot.maxHp,
        state.enemy.role === "Boss",
      );

      return {
        skillName: getEnemySkillName(state.enemy, state.bossPhase, state.turn),
        intent: getEnemyIntent(state.enemy, state.bossPhase, state.turn),
        rawDamage: rawProfile.damage,
        guardedDamage: guardedProfile?.damage ?? rawProfile.damage,
        failedGuardDamage: failedGuardProfile?.damage ?? rawProfile.damage,
        threatLabel: threat.label,
        threatTone: threat.tone,
      };
    },
    // 这些状态会在首领攻击后的下一回合生效，因此需要明确展示给玩家。
    activeBossEffects: (state) => {
      const effects = [];

      if (state.bossEffects.enemyBarrier > 0) {
        effects.push({
          id: "enemy-barrier",
          label: "首领护幕",
          detail: `下次攻击先抵消 ${state.bossEffects.enemyBarrier} 点伤害`,
          tone: "high",
        });
      }

      if (state.bossEffects.playerDamageDown > 0) {
        effects.push({
          id: "player-damage-down",
          label: "输出受限",
          detail: `下次伤害降低 ${Math.round(state.bossEffects.playerDamageDown * 100)}%`,
          tone: "high",
        });
      }

      if (state.bossEffects.skillLocked) {
        effects.push({
          id: "skill-locked",
          label: "技能封锁",
          detail: "下回合无法使用 Vue 爆发",
          tone: "critical",
        });
      }

      if (state.bossEffects.guardBreak) {
        effects.push({
          id: "guard-break",
          label: "防御失效",
          detail: "下回合调试防御几乎不会减伤",
          tone: "critical",
        });
      }

      return effects;
    },
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
      const queuedBossEffects = { ...this.bossEffects };
      this.bossEffects = createBossEffects();
      // 如果 MP 不足，技能会自动降级成普通攻击。
      let enemyIntent = getEnemyIntent(this.enemy, this.bossPhase, this.turn);
      let action = this.selectedAction;
      let playerDamage = 0;
      let enemyDamage = 0;
      let effectLine = "";

      if (!correct) {
        this.wrongAnswerCount += 1;
      }

      if (queuedBossEffects.skillLocked && action === "skill") {
        action = "attack";
        effectLine = "首领留下的封锁仍在生效，Vue 爆发被压制成了普通攻击。";
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

          if (queuedBossEffects.guardBreak) {
            this.pendingGuard = Math.min(this.pendingGuard, 0.25);
          }

          this.playerSnapshot.mp = Math.min(
            this.playerSnapshot.maxMp,
            this.playerSnapshot.mp + 6,
          );
          effectLine =
            nextCombo >= 2
              ? "回答正确，调试防御保住了连击并削弱了下一次受击。"
              : "回答正确，调试防御减轻了敌人的反击。";

          if (queuedBossEffects.guardBreak) {
            effectLine = `${effectLine} 但首领的封锁让这次防御几乎失效。`;
          }
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

      if (playerDamage > 0 && queuedBossEffects.playerDamageDown > 0) {
        playerDamage = Math.max(
          1,
          Math.round(playerDamage * (1 - queuedBossEffects.playerDamageDown)),
        );
        effectLine = `${effectLine} 你的输出被首领压制了一部分。`;
      }

      if (playerDamage > 0 && queuedBossEffects.enemyBarrier > 0) {
        const absorbedDamage = Math.min(playerDamage, queuedBossEffects.enemyBarrier);
        playerDamage -= absorbedDamage;
        effectLine = `${effectLine} 首领护幕吸收了 ${absorbedDamage} 点伤害。`;
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
      const enemySkillName = getEnemySkillName(this.enemy, this.bossPhase, this.turn);
      const enemyCounterProfile = getEnemyCounterProfile(
        this.enemy,
        this.playerSnapshot,
        this.bossPhase,
        this.turn,
        this.pendingGuard,
      );
      const enemyThreat = buildThreatMeta(
        enemyCounterProfile?.damage ?? 0,
        this.playerSnapshot.maxHp,
        this.enemy.role === "Boss",
      );
      const bossEffectLine = applyBossAftershock(
        this.enemy,
        this.bossPhase,
        enemySkillName,
        this.playerSnapshot,
        this.bossEffects,
      );

      enemyDamage = enemyCounterProfile?.damage ?? 0;
      this.playerSnapshot.hp = Math.max(0, this.playerSnapshot.hp - enemyDamage);
      this.pendingGuard = 0;

      if (bossEffectLine) {
        effectLine = `${effectLine} ${bossEffectLine}`;
      }

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
        enemySkillName,
        enemyThreatLabel: enemyThreat.label,
        enemyThreatTone: enemyThreat.tone,
        explanation: this.currentQuestion.explanation,
        effectLine,
        comboStreak: this.comboStreak,
      };

      this.log.unshift(
        `${this.enemy.name} 施放了「${enemySkillName}」，以${enemyIntent}造成 ${enemyDamage} 点伤害。`,
      );
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
