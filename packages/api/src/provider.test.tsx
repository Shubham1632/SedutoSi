// @vitest-environment jsdom
import type { ReactNode } from "react";
import { createElement } from "react";
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AppSupabaseClient } from "./provider";
import { createQueryClient, SupabaseProvider, useSupabase } from "./provider";

function fakeClient() {
  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => undefined } },
      }),
    },
  } as unknown as AppSupabaseClient;
}

describe("createQueryClient", () => {
  it("sets sensible cross-platform defaults", () => {
    const qc = createQueryClient();
    const defaults = qc.getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(30 * 1000);
    expect(defaults.queries?.retry).toBe(1);
  });
});

describe("useSupabase", () => {
  it("throws when used outside a <SupabaseProvider>", () => {
    // React logs the thrown render error to console.error; that's expected
    // noise from this negative test, not a real failure.
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => renderHook(() => useSupabase())).toThrow(
      "useSupabase must be used within a <SupabaseProvider>",
    );
    spy.mockRestore();
  });

  it("returns the client passed to <SupabaseProvider>", () => {
    const client = fakeClient();
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(SupabaseProvider, { client, children });

    const { result } = renderHook(() => useSupabase(), { wrapper });
    expect(result.current).toBe(client);
  });

  it("reuses a caller-provided QueryClient instead of creating a new one", () => {
    const client = fakeClient();
    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(SupabaseProvider, { client, queryClient, children });

    const { result } = renderHook(() => useSupabase(), { wrapper });
    expect(result.current).toBe(client);
  });
});
