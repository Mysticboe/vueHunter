<template>
  <main class="page-shell utility-view">
    <header class="panel utility-header">
      <div>
        <div class="panel__eyebrow">Skill Tree</div>
        <h1 class="panel__title">Turn Vue mastery into passive power.</h1>
      </div>
      <div class="page-links">
        <button
          type="button"
          class="button button--ghost"
          @click="router.push('/map')"
        >
          Map
        </button>
        <button
          type="button"
          class="button button--ghost"
          @click="router.push('/inventory')"
        >
          Inventory
        </button>
        <button
          type="button"
          class="button button--ghost"
          @click="router.push('/handbook')"
        >
          Handbook
        </button>
      </div>
    </header>

    <!-- Summary keeps the unlock economy visible before the player spends points. -->
    <section class="panel utility-summary">
      <div class="summary-grid">
        <div>
          <span>Skill points</span>
          <strong>{{ gameStore.player.skillPoints }}</strong>
        </div>
        <div>
          <span>Level</span>
          <strong>{{ gameStore.player.level }}</strong>
        </div>
        <div>
          <span>Unlocked chapters</span>
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

    <!-- Skill cards are generated entirely from skill data plus current player state. -->
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
          Chapter {{ skill.chapterId }}
          <span>{{ skill.owned ? "Unlocked" : `Cost ${skill.cost}` }}</span>
        </div>
        <h2 class="panel__title">{{ skill.name }}</h2>
        <p>{{ skill.description }}</p>
        <small>
          Requires level {{ skill.unlockLevel }}
          <template v-if="skill.prerequisiteNames.length > 0">
            | Needs {{ skill.prerequisiteNames.join(", ") }}
          </template>
        </small>
        <button
          type="button"
          class="button"
          :class="skill.owned ? 'button--primary' : 'button--ghost'"
          :disabled="skill.owned || !skill.available"
          @click="unlockSkill(skill.id)"
        >
          {{ skill.owned ? "Unlocked" : skill.available ? "Unlock skill" : "Locked" }}
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

// The skill tree is a read-heavy screen backed by one unlock action.
const router = useRouter();
const gameStore = useGameStore();
const feedback = ref("");

// Enrich each skill with ownership state and readable prerequisite names for the UI.
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

// Unlock attempts route through the store so requirements stay enforced in one place.
function unlockSkill(skillId) {
  const skill = getSkillById(skillId);
  const unlocked = gameStore.unlockSkill(skillId);
  feedback.value = unlocked
    ? `${skill?.name ?? "Skill"} unlocked successfully.`
    : "That skill is not available yet.";
}
</script>
