# Vue Hunter

Vue Hunter is a Vue 3 + Vite + Pinia + Vue Router learning RPG. The current MVP ships a playable loop with:

- A home screen with new game, continue actions, and a live quest board
- A world map with 7 chapters and chapter unlock flow
- Turn-based quiz battles driven by single-choice, judge, and code-fill prompts
- Boss encounters with phase shifts, intent hints, combo tracking, and rank feedback
- EXP, gold, level-up rewards, skill points, and autosave through localStorage
- Inventory, equipment, camp rest, a skill tree, a handbook, wrong-answer review, chapter drills, practice session ranks, milestones, and shared top navigation

## Run locally

Tested with Node.js `24.14.0` and npm `11.9.0`.

1. Install dependencies with `npm install`
2. Start the dev server with `npm run dev`
3. Build for production with `npm run build`

## Project structure

- `src/views`: home, map, battle, practice, and utility screens
- `src/stores`: persistent game state and temporary battle state
- `src/data`: chapters, enemies, and question banks
- `src/utils`: damage, level, and save helpers
- `src/components`: reusable battle, map, and stat display UI

## MVP scope covered

- Home page
- Map page
- Battle page
- Player stats and monster encounters
- Single-choice battle flow
- Rewards and chapter unlocks
- localStorage persistence
