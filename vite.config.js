import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// 当前构建保持极简，只启用 Vue 官方插件。
export default defineConfig({
  plugins: [vue()],
});
