import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import router from "./router";
import { useGameStore } from "./stores/game";
import "./styles.css";

// 创建单页游戏应用的根实例。
const app = createApp(App);
// Pinia 同时管理长期进度和短期战斗状态。
const pinia = createPinia();

app.use(pinia);

// 挂载前先恢复存档，保证首屏就和存档状态一致。
const gameStore = useGameStore(pinia);
gameStore.hydrateFromSave();
gameStore.enableAutoSave();

// 在状态初始化之后再注册路由，避免页面先读到空状态。
app.use(router);
app.mount("#app");
