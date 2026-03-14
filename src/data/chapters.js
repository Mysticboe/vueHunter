// 章节定义了世界地图顺序、解锁流程和每个区域的学习主题。
export const chapters = [
  {
    id: 1,
    title: "模板之森",
    subtitle: "学习 Vue 模板语法的基础表达方式。",
    storyBeat: "森林上空不断闪烁着失控的绑定和紊乱的指令，所有页面都在摇晃。",
    knowledgePoints: ["文本插值", "v-bind", "v-if", "v-for", "v-on"],
    enemyIds: [101, 102],
    accent: "forest",
  },
  {
    id: 2,
    title: "响应峡谷",
    subtitle: "掌握 ref、reactive 与响应式更新。",
    storyBeat: "峡谷两侧回荡着数据脉冲，但有些值始终无法抵达表层。",
    knowledgePoints: ["ref", "reactive", ".value", "响应式更新"],
    enemyIds: [201, 202],
    accent: "canyon",
  },
  {
    id: 3,
    title: "计算高塔",
    subtitle: "把推导逻辑和副作用控制变成战斗策略。",
    storyBeat: "高塔会记录每一次依赖追踪，并惩罚一切不受控制的副作用。",
    knowledgePoints: ["computed", "watch", "watchEffect"],
    enemyIds: [301, 302],
    accent: "tower",
  },
  {
    id: 4,
    title: "组件王国",
    subtitle: "修复 props、emit、slot 与破裂的组件契约。",
    storyBeat: "王国庭院已经支离破碎，父子组件之间再也听不见彼此的声音。",
    knowledgePoints: ["组件", "props", "emit", "slot"],
    enemyIds: [401, 402],
    accent: "kingdom",
  },
  {
    id: 5,
    title: "组合秘境",
    subtitle: "抽离逻辑、整理 setup，并掌握可复用状态。",
    storyBeat: "秘境深处的重复模式不断轮回，只有被雕刻成 composable 才能真正脱困。",
    knowledgePoints: ["setup", "Composition API", "composables", "逻辑复用"],
    enemyIds: [501, 502],
    accent: "sanctum",
  },
  {
    id: 6,
    title: "路由迷城",
    subtitle: "掌握路由记录、动态参数与导航守卫。",
    storyBeat: "迷城不断折叠自我，只有谨慎声明每一条路径，旅人才能找到出口。",
    knowledgePoints: ["Vue Router", "动态参数", "router-link", "导航守卫"],
    enemyIds: [601, 602],
    accent: "labyrinth",
  },
  {
    id: 7,
    title: "状态神殿",
    subtitle: "用 Pinia 稳定 store、actions 和全局状态流。",
    storyBeat: "神殿核心汇聚了所有碎裂的状态支流，最终试炼将在这里检验结构、行为与共享真相。",
    knowledgePoints: ["Pinia", "defineStore", "actions", "共享状态"],
    enemyIds: [701, 702],
    accent: "temple",
  },
];

// 地图、战斗和练习模式都会用到的章节查询方法。
export function getChapterById(chapterId) {
  return chapters.find((chapter) => chapter.id === Number(chapterId)) ?? null;
}
