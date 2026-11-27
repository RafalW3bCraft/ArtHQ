import { defineConfig } from "vitest/config";
export default defineConfig({
  envDir: new URL("./tests/env", import.meta.url).pathname,
  test: {
    environment: "node",
    include: ["tests/integration/**/*.integration.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
