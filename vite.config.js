import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// The build stays intentionally small: Vue plugin only, no extra bundler complexity yet.
export default defineConfig({
  plugins: [vue()],
});
