import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const resolve = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": resolve("./src"),
    },
  },
});
