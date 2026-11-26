import { defineConfig } from "vitest/config";
export default defineConfig({
  envDir: new URL("./tests/env", import.meta.url).pathname,
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 10000,
  },
  resolve: {
    alias: { "@shared": new URL("./shared", import.meta.url).pathname },
  },
});
