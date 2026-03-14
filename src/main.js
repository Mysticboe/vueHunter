import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import router from "./router";
import { useGameStore } from "./stores/game";
import "./styles.css";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);

const gameStore = useGameStore(pinia);
gameStore.hydrateFromSave();
gameStore.enableAutoSave();

app.use(router);
app.mount("#app");

