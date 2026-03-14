import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import router from "./router";
import { useGameStore } from "./stores/game";
import "./styles.css";

// Create the root Vue app instance for the single-page game shell.
const app = createApp(App);
// Pinia holds both the long-lived run state and short-lived battle state.
const pinia = createPinia();

app.use(pinia);

// Restore any saved run before mounting so the first paint matches the save file.
const gameStore = useGameStore(pinia);
gameStore.hydrateFromSave();
gameStore.enableAutoSave();

// Register routing after stores so route views can read hydrated state immediately.
app.use(router);
app.mount("#app");
