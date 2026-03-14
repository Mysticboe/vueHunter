<template>
  <main class="page-shell utility-view">
    <header class="panel utility-header">
      <div>
        <div class="panel__eyebrow">技能树</div>
        <h1 class="panel__title">把 Vue 知识转化成持续生效的成长能力。</h1>
      </div>
      <div class="page-links">
        <button
          type="button"
          class="button button--ghost"
          @click="router.push('/map')"
        >
          地图
        </button>
        <button
          type="button"
          class="button button--ghost"
          @click="router.push('/inventory')"
        >
          背包
        </button>
        <button
          type="button"
          class="button button--ghost"
          @click="router.push('/handbook')"
        >
          图鉴
        </button>
      </div>
    </header>

    <!-- 顶部摘要先把资源情况和解锁条件展示清楚。 -->
    <section class="panel utility-summary">
      <div class="summary-grid">
        <div>
          <span>技能点</span>
          <strong>{{ gameStore.player.skillPoints }}</strong>
        </div>
        <div>
          <span>等级</span>
          <strong>{{ gameStore.player.level }}</strong>
        </div>
        <div>
          <span>已解锁章节</span>
          <strong>{{ gameStore.player.unlockedChapters.length }}</strong>
        </div>
      </div>
      <p
        v-if="feedback"
        class="muted-copy"
      >
        {{ feedback }}
      </p>
    </section>

    <!-- 技能卡片由技能数据和当前玩家状态共同生成。 -->
    <section class="skill-grid">
      <article
        v-for="skill in skillCards"
        :key="skill.id"
        class="panel skill-card"
        :class="{
          'skill-card--owned': skill.owned,
          'skill-card--available': skill.available,
          'skill-card--locked': !skill.owned && !skill.available,
        }"
      >
        <div class="panel__eyebrow">
          第 {{ skill.chapterId }} 章
          <span>{{ skill.owned ? "已解锁" : `消耗 ${skill.cost}` }}</span>
        </div>
        <h2 class="panel__title">{{ skill.name }}</h2>
        <p>{{ skill.description }}</p>
        <small>
          需要等级 {{ skill.unlockLevel }}
          <template v-if="skill.prerequisiteNames.length > 0">
            | 前置：{{ skill.prerequisiteNames.join("、") }}
          </template>
        </small>
        <button
          type="button"
          class="button"
          :class="skill.owned ? 'button--primary' : 'button--ghost'"
          :disabled="skill.owned || !skill.available"
          @click="unlockSkill(skill.id)"
        >
          {{ skill.owned ? "已解锁" : skill.available ? "解锁技能" : "未满足条件" }}
        </button>
      </article>
    </section>
  </main>
</template>

<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

import { getSkillById, skills } from "../data/skills";
import { useGameStore } from "../stores/game";

// 技能树是一个读取为主、解锁为辅的页面。
const router = useRouter();
const gameStore = useGameStore();
const feedback = ref("");

// 为每个技能补上拥有状态和前置技能名称，方便 UI 渲染。
const skillCards = computed(() =>
  skills.map((skill) => ({
    ...skill,
    owned: gameStore.player.skills.includes(skill.id),
    available: gameStore.canUnlockSkill(skill.id),
    prerequisiteNames: skill.prerequisites
      .map((skillId) => getSkillById(skillId)?.name)
      .filter(Boolean),
  })),
);

// 技能解锁统一走 store，条件校验只维护一份。
function unlockSkill(skillId) {
  const skill = getSkillById(skillId);
  const unlocked = gameStore.unlockSkill(skillId);
  feedback.value = unlocked
    ? `${skill?.name ?? "技能"} 解锁成功。`
    : "这个技能暂时还不能解锁。";
}
</script>
