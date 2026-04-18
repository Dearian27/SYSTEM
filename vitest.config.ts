import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup/dom.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      obsidian: path.resolve(__dirname, "tests/mocks/obsidian.ts"),
    },
  },
});
