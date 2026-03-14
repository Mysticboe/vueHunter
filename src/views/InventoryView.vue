<template>
  <main class="page-shell utility-view">
    <header class="panel utility-header">
      <div>
        <div class="panel__eyebrow">Inventory</div>
        <h1 class="panel__title">Pack, gear, and recovery tools.</h1>
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
          @click="router.push('/skills')"
        >
          Skill tree
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

    <section class="utility-grid">
      <section class="panel">
        <div class="panel__eyebrow">Hunter Sheet</div>
        <h2 class="panel__title">{{ gameStore.player.name }}</h2>
        <StatBar
          label="HP"
          :value="gameStore.player.hp"
          :max="gameStore.player.maxHp"
          tone="hp"
        />
        <StatBar
          label="MP"
          :value="gameStore.player.mp"
          :max="gameStore.player.maxMp"
          tone="mp"
        />
        <div class="summary-grid">
          <div>
            <span>Attack</span>
            <strong>{{ gameStore.player.attack }}</strong>
          </div>
          <div>
            <span>Defense</span>
            <strong>{{ gameStore.player.defense }}</strong>
          </div>
        </div>
        <div class="stack-actions">
          <button
            type="button"
            class="button button--ghost"
            @click="restAtCamp"
          >
            Rest at camp (14 gold)
          </button>
          <small
            v-if="feedback"
            class="muted-copy"
          >
            {{ feedback }}
          </small>
        </div>
      </section>

      <section class="panel">
        <div class="panel__eyebrow">Consumables</div>
        <h2 class="panel__title">Field recovery</h2>
        <div
          v-if="consumables.length > 0"
          class="card-list"
        >
          <article
            v-for="item in consumables"
            :key="item.id"
            class="list-card"
          >
            <div>
              <strong>{{ item.name }}</strong>
              <p>{{ item.description }}</p>
              <small>Qty: {{ item.quantity }}</small>
            </div>
            <button
              type="button"
              class="button button--primary"
              @click="useItem(item.id)"
            >
              Use
            </button>
          </article>
        </div>
        <p
          v-else
          class="muted-copy"
        >
          No consumables left. Clear more encounters for drops.
        </p>
      </section>

      <section class="panel panel--wide">
        <div class="panel__eyebrow">Equipment</div>
        <h2 class="panel__title">Current build</h2>
        <div
          v-if="equipment.length > 0"
          class="card-list"
        >
          <article
            v-for="item in equipment"
            :key="item.id"
            class="list-card"
          >
            <div>
              <strong>{{ item.name }}</strong>
              <p>{{ item.description }}</p>
              <small>
                Slot: {{ item.slot }}
                <template v-if="item.statsText">
                  | {{ item.statsText }}
                </template>
              </small>
            </div>
            <button
              type="button"
              class="button"
              :class="isEquipped(item.id) ? 'button--primary' : 'button--ghost'"
              @click="toggleEquip(item.id)"
            >
              {{ isEquipped(item.id) ? "Unequip" : "Equip" }}
            </button>
          </article>
        </div>
        <p
          v-else
          class="muted-copy"
        >
          No equipment collected yet.
        </p>
      </section>
    </section>
  </main>
</template>

<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

import StatBar from "../components/common/StatBar.vue";
import { getItemById } from "../data/items";
import { useGameStore } from "../stores/game";

const router = useRouter();
const gameStore = useGameStore();
const feedback = ref("");

function toInventoryItems(type) {
  return gameStore.player.inventory
    .map((entry) => {
      const item = getItemById(entry.itemId);

      if (!item || item.type !== type) {
        return null;
      }

      return {
        ...item,
        quantity: entry.quantity,
        statsText: item.stats
          ? Object.entries(item.stats)
              .map(([key, value]) => `${key} +${value}`)
              .join(", ")
          : "",
      };
    })
    .filter(Boolean);
}

const consumables = computed(() => toInventoryItems("consumable"));
const equipment = computed(() => toInventoryItems("equipment"));

function isEquipped(itemId) {
  return Object.values(gameStore.player.equippedItems).includes(itemId);
}

function useItem(itemId) {
  const item = getItemById(itemId);
  const used = gameStore.useItem(itemId);
  feedback.value = used
    ? `${item?.name ?? "Item"} used successfully.`
    : "That item cannot be used right now.";
}

function toggleEquip(itemId) {
  const item = getItemById(itemId);
  const changed = gameStore.equipItem(itemId);
  feedback.value = changed
    ? `${item?.name ?? "Item"} updated in your loadout.`
    : "That item cannot be equipped.";
}

function restAtCamp() {
  const rested = gameStore.restAtCamp();
  feedback.value = rested
    ? "Camp rest complete. HP and MP are back to full."
    : "You need at least 14 gold to rest.";
}
</script>

