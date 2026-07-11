import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts"],
      // index.ts is a pure re-export barrel — nothing to unit-test.
      exclude: ["src/**/*.test.ts", "src/index.ts"],
    },
  },
});
