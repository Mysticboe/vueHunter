// 道具同时覆盖消耗品和装备，让背包系统保持数据驱动。
export const items = [
  {
    id: "patch-potion",
    name: "补丁药水",
    type: "consumable",
    description: "恢复 35 点 HP，适合在下一场遭遇前补状态。",
    effect: {
      hp: 35,
    },
  },
  {
    id: "focus-tonic",
    name: "专注药剂",
    type: "consumable",
    description: "恢复 20 点 MP，便于打出更强技能回合。",
    effect: {
      mp: 20,
    },
  },
  {
    id: "ref-training-sword",
    name: "Ref 训练木剑",
    type: "equipment",
    slot: "weapon",
    description: "新手木剑，能让基础攻击更扎实。",
    stats: {
      attack: 2,
    },
  },
  {
    id: "oak-guard-cloak",
    name: "橡木守护披风",
    type: "equipment",
    slot: "armor",
    description: "适合野外试炼的披风，能稍微强化你的防御。",
    stats: {
      defense: 1,
      maxHp: 8,
    },
  },
  {
    id: "reactive-charm",
    name: "响应护符",
    type: "equipment",
    slot: "charm",
    description: "嗡鸣不止的护符，能同时稳定生命与法力。",
    stats: {
      maxHp: 10,
      maxMp: 4,
    },
  },
  {
    id: "computed-ring",
    name: "Computed 戒指",
    type: "equipment",
    slot: "ring",
    description: "一枚精确运作的戒指，提升攻击和法力效率。",
    stats: {
      attack: 2,
      maxMp: 6,
    },
  },
  {
    id: "slot-cape",
    name: "插槽披风",
    type: "equipment",
    slot: "cape",
    description: "缝满接口的披风，让防守时的插槽结构更稳固。",
    stats: {
      defense: 2,
      maxHp: 12,
    },
  },
  {
    id: "emitter-greaves",
    name: "事件护胫",
    type: "equipment",
    slot: "boots",
    description: "针对事件节奏打造的护胫，让攻击出手更利落。",
    stats: {
      attack: 1,
      defense: 2,
      maxMp: 4,
    },
  },
  {
    id: "composable-lantern",
    name: "组合提灯",
    type: "equipment",
    slot: "relic",
    description: "能照出重复逻辑的提灯，奖励耐心整理结构的人。",
    stats: {
      maxMp: 8,
      defense: 1,
    },
  },
  {
    id: "setup-sigil",
    name: "Setup 纹章",
    type: "equipment",
    slot: "sigil",
    description: "雕刻精细的纹章，同时强化 setup 纪律和战斗节奏。",
    stats: {
      attack: 2,
      maxHp: 8,
      maxMp: 8,
    },
  },
  {
    id: "route-thread",
    name: "路由丝线",
    type: "equipment",
    slot: "thread",
    description: "发光丝线能在嵌套路由中帮你保持路径稳定。",
    stats: {
      defense: 2,
      maxMp: 6,
    },
  },
  {
    id: "guardians-compass",
    name: "守卫者罗盘",
    type: "equipment",
    slot: "compass",
    description: "对守卫路径极其敏感的罗盘，适合快速切换与导航。",
    stats: {
      attack: 2,
      defense: 2,
      maxHp: 10,
    },
  },
  {
    id: "pinia-scroll",
    name: "Pinia 卷轴",
    type: "equipment",
    slot: "scroll",
    description: "封印卷轴记载着清晰的 store 边界和稳定的共享状态结构。",
    stats: {
      attack: 1,
      maxMp: 8,
    },
  },
  {
    id: "crown-of-shared-state",
    name: "共享状态王冠",
    type: "equipment",
    slot: "crown",
    description: "最终王冠，能协调攻击、防御和每一条已连接的状态通道。",
    stats: {
      attack: 3,
      defense: 3,
      maxHp: 14,
      maxMp: 10,
    },
  },
];

// 奖励结算、背包渲染和装备校验都会用到这个查询方法。
export function getItemById(itemId) {
  return items.find((item) => item.id === itemId) ?? null;
}
