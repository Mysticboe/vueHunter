<template>
  <main class="page-shell utility-view">
    <header class="panel utility-header">
      <div>
        <div class="panel__eyebrow">背包</div>
        <h1 class="panel__title">整理装备、道具和恢复资源。</h1>
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
          @click="router.push('/skills')"
        >
          技能树
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

    <section class="utility-grid">
      <!-- 勇者面板直接映射主进度里的属性，并提供快速休息入口。 -->
      <section class="panel">
        <div class="panel__eyebrow">勇者面板</div>
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
            <span>攻击</span>
            <strong>{{ gameStore.player.attack }}</strong>
          </div>
          <div>
            <span>防御</span>
            <strong>{{ gameStore.player.defense }}</strong>
          </div>
        </div>
        <div class="stack-actions">
          <button
            type="button"
            class="button button--ghost"
            @click="restAtCamp"
          >
            营地休息（14 金币）
          </button>
          <small
            v-if="feedback"
            class="muted-copy"
          >
            {{ feedback }}
          </small>
        </div>
      </section>

      <!-- 消耗品区域从背包数据中过滤出可使用道具。 -->
      <section class="panel">
        <div class="panel__eyebrow">消耗品</div>
        <h2 class="panel__title">战斗恢复</h2>
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
              <small>数量：{{ item.quantity }}</small>
            </div>
            <button
              type="button"
              class="button button--primary"
              @click="useItem(item.id)"
            >
              使用
            </button>
          </article>
        </div>
        <p
          v-else
          class="muted-copy"
        >
          当前没有消耗品了，继续战斗获得掉落吧。
        </p>
      </section>

      <!-- 装备区复用同一套背包数据，只是增加了穿戴状态。 -->
      <section class="panel panel--wide">
        <div class="panel__eyebrow">装备</div>
        <h2 class="panel__title">当前配装</h2>
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
                部位：{{ item.slot }}
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
              {{ isEquipped(item.id) ? "卸下" : "装备" }}
            </button>
          </article>
        </div>
        <p
          v-else
          class="muted-copy"
        >
          还没有收集到装备。
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

// 背包页尽量保持轻量，所有变更都交给主 store 处理。
const router = useRouter();
const gameStore = useGameStore();
const feedback = ref("");

// 把背包条目加工成适合界面展示的结构，并按类型过滤。
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

// 分别拆成消耗品和装备两块，模板更清晰。
const consumables = computed(() => toInventoryItems("consumable"));
const equipment = computed(() => toInventoryItems("equipment"));

// 穿戴状态按部位保存，因此这里从已装备映射里查重。
function isEquipped(itemId) {
  return Object.values(gameStore.player.equippedItems).includes(itemId);
}

// 用反馈文案替代弹窗，减少打断。
function useItem(itemId) {
  const item = getItemById(itemId);
  const used = gameStore.useItem(itemId);
  feedback.value = used
    ? `${item?.name ?? "道具"} 已成功使用。`
    : "这个道具当前无法使用。";
}

// 装备切换统一交给 store 处理，属性重算只保留一套逻辑。
function toggleEquip(itemId) {
  const item = getItemById(itemId);
  const changed = gameStore.equipItem(itemId);
  feedback.value = changed
    ? `${item?.name ?? "装备"} 已更新到当前配装。`
    : "这个装备当前无法穿戴。";
}

// 这里复用地图页同样的营地休息逻辑。
function restAtCamp() {
  const rested = gameStore.restAtCamp();
  feedback.value = rested
    ? "休息完成，HP 和 MP 都已经回满。"
    : "金币不足 14，暂时不能休息。";
}
</script>
