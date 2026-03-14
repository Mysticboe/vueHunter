// Items cover both consumables and equipment so the inventory can stay data-driven.
export const items = [
  {
    id: "patch-potion",
    name: "Patch Potion",
    type: "consumable",
    description: "Restore 35 HP before the next encounter.",
    effect: {
      hp: 35,
    },
  },
  {
    id: "focus-tonic",
    name: "Focus Tonic",
    type: "consumable",
    description: "Restore 20 MP for stronger skill turns.",
    effect: {
      mp: 20,
    },
  },
  {
    id: "ref-training-sword",
    name: "Ref Training Sword",
    type: "equipment",
    slot: "weapon",
    description: "Starter blade that sharpens your basic attacks.",
    stats: {
      attack: 2,
    },
  },
  {
    id: "oak-guard-cloak",
    name: "Oak Guard Cloak",
    type: "equipment",
    slot: "armor",
    description: "A field cloak that adds a little bulk to your guard.",
    stats: {
      defense: 1,
      maxHp: 8,
    },
  },
  {
    id: "reactive-charm",
    name: "Reactive Charm",
    type: "equipment",
    slot: "charm",
    description: "A humming trinket that stabilizes health and mana.",
    stats: {
      maxHp: 10,
      maxMp: 4,
    },
  },
  {
    id: "computed-ring",
    name: "Computed Ring",
    type: "equipment",
    slot: "ring",
    description: "A precise ring that boosts attack and mana efficiency.",
    stats: {
      attack: 2,
      maxMp: 6,
    },
  },
  {
    id: "slot-cape",
    name: "Slot Cape",
    type: "equipment",
    slot: "cape",
    description: "A stitched cape that reinforces defensive insertion points.",
    stats: {
      defense: 2,
      maxHp: 12,
    },
  },
  {
    id: "emitter-greaves",
    name: "Emitter Greaves",
    type: "equipment",
    slot: "boots",
    description: "Greaves tuned for cleaner event timing and sharper attacks.",
    stats: {
      attack: 1,
      defense: 2,
      maxMp: 4,
    },
  },
  {
    id: "composable-lantern",
    name: "Composable Lantern",
    type: "equipment",
    slot: "relic",
    description: "A lantern that reveals repeated logic and rewards patient structure.",
    stats: {
      maxMp: 8,
      defense: 1,
    },
  },
  {
    id: "setup-sigil",
    name: "Setup Sigil",
    type: "equipment",
    slot: "sigil",
    description: "An engraved sigil that sharpens both setup discipline and battle tempo.",
    stats: {
      attack: 2,
      maxHp: 8,
      maxMp: 8,
    },
  },
  {
    id: "route-thread",
    name: "Route Thread",
    type: "equipment",
    slot: "thread",
    description: "A glowing thread that keeps your path stable through nested routes.",
    stats: {
      defense: 2,
      maxMp: 6,
    },
  },
  {
    id: "guardians-compass",
    name: "Guardian's Compass",
    type: "equipment",
    slot: "compass",
    description: "A compass tuned to guarded paths and fast transitions.",
    stats: {
      attack: 2,
      defense: 2,
      maxHp: 10,
    },
  },
  {
    id: "pinia-scroll",
    name: "Pinia Scroll",
    type: "equipment",
    slot: "scroll",
    description: "A sealed scroll describing clean store boundaries and stable shared state.",
    stats: {
      attack: 1,
      maxMp: 8,
    },
  },
  {
    id: "crown-of-shared-state",
    name: "Crown of Shared State",
    type: "equipment",
    slot: "crown",
    description: "The final crown that harmonizes offense, defense, and every linked state channel.",
    stats: {
      attack: 3,
      defense: 3,
      maxHp: 14,
      maxMp: 10,
    },
  },
];

// Shared item lookup for rewards, inventory rendering, and equip validation.
export function getItemById(itemId) {
  return items.find((item) => item.id === itemId) ?? null;
}
