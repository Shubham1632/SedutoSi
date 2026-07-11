import type { ReactNode } from "react";
import { createElement } from "react";
import { QueryClient } from "@tanstack/react-query";

import type { AppSupabaseClient } from "@acme/api";
import { SupabaseProvider } from "@acme/api";

/** A QueryClient tuned for tests: no retries, so failures surface immediately. */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

/** Wraps a hook under test with the same providers the real apps mount. */
export function withSupabaseProvider(
  client: AppSupabaseClient,
  queryClient: QueryClient = createTestQueryClient(),
) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(SupabaseProvider, { client, queryClient, children });
  };
}
