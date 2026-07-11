import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts", "src/**/*.tsx"],
      // index.ts is a pure re-export barrel; types.ts is generated Supabase
      // type declarations with no runtime code — neither is unit-testable.
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
        "src/index.ts",
        "src/types.ts",
      ],
    },
  },
});
