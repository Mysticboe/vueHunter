// Chapters define the world map order, unlock flow, and learning topics per region.
export const chapters = [
  {
    id: 1,
    title: "Template Woods",
    subtitle: "Learn the language of Vue templates.",
    storyBeat: "The forest canopy flickers with broken bindings and unstable directives.",
    knowledgePoints: ["Interpolation", "v-bind", "v-if", "v-for", "v-on"],
    enemyIds: [101, 102],
    accent: "forest",
  },
  {
    id: 2,
    title: "Reactive Canyon",
    subtitle: "Master refs, reactive state, and updates.",
    storyBeat: "Signals echo through the canyon walls, but some values never reach the surface.",
    knowledgePoints: ["ref", "reactive", ".value", "Reactive updates"],
    enemyIds: [201, 202],
    accent: "canyon",
  },
  {
    id: 3,
    title: "Computed Tower",
    subtitle: "Turn derivations and side effects into strategy.",
    storyBeat: "The tower records every dependency and punishes careless side effects.",
    knowledgePoints: ["computed", "watch", "watchEffect"],
    enemyIds: [301, 302],
    accent: "tower",
  },
  {
    id: 4,
    title: "Component Kingdom",
    subtitle: "Repair props, emits, slots, and broken UI contracts.",
    storyBeat: "Courtyards split into fragments where parent and child components can no longer hear each other.",
    knowledgePoints: ["Components", "props", "emit", "slots"],
    enemyIds: [401, 402],
    accent: "kingdom",
  },
  {
    id: 5,
    title: "Composable Sanctum",
    subtitle: "Extract logic, structure setup, and master reusable state.",
    storyBeat: "Inside the sanctum, repeated patterns loop forever until they are carved into reusable composables.",
    knowledgePoints: ["setup", "Composition API", "composables", "logic reuse"],
    enemyIds: [501, 502],
    accent: "sanctum",
  },
  {
    id: 6,
    title: "Router Labyrinth",
    subtitle: "Chart route records, dynamic params, and navigation guards.",
    storyBeat: "The labyrinth folds over itself, sending travelers in circles unless each route is declared with care.",
    knowledgePoints: ["Vue Router", "dynamic params", "router-link", "navigation guards"],
    enemyIds: [601, 602],
    accent: "labyrinth",
  },
  {
    id: 7,
    title: "State Temple",
    subtitle: "Stabilize shared stores, actions, and global state flow with Pinia.",
    storyBeat: "At the temple core, every fractured state stream converges into one final test of structure, actions, and shared truth.",
    knowledgePoints: ["Pinia", "defineStore", "actions", "shared state"],
    enemyIds: [701, 702],
    accent: "temple",
  },
];

// Small lookup helper used by map, battle, and practice flows.
export function getChapterById(chapterId) {
  return chapters.find((chapter) => chapter.id === Number(chapterId)) ?? null;
}
