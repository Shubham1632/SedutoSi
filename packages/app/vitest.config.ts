import { defineConfig } from "vitest/config";

export default defineConfig({
  // Hook integration tests render @acme/api's <SupabaseProvider> (JSX,
  // automatic runtime) straight from source — match that runtime here.
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
        // Test-only helpers, not product code.
        "src/test-utils/**",
        // Pure re-export barrel.
        "src/index.ts",
        // Intentional stub (CMS content hooks were removed for this app) —
        // nothing to cover.
        "src/hooks/use-content.ts",
      ],
    },
  },
});
