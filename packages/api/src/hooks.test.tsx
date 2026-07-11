// @vitest-environment jsdom
import type { ReactNode } from "react";
import { createElement } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AppSupabaseClient } from "./provider";
import { useSession } from "./hooks";
import { SupabaseProvider } from "./provider";

type AuthChangeCallback = (event: string, session: unknown) => void;

function fakeClient(initialSession: unknown) {
  let onChange: AuthChangeCallback | null = null;
  const unsubscribe = vi.fn();
  const client = {
    auth: {
      getSession: () => Promise.resolve({ data: { session: initialSession } }),
      onAuthStateChange: (cb: AuthChangeCallback) => {
        onChange = cb;
        return { data: { subscription: { unsubscribe } } };
      },
    },
  } as unknown as AppSupabaseClient;

  return {
    client,
    unsubscribe,
    emit: (session: unknown) => onChange?.("SIGNED_IN", session),
  };
}

function wrapperFor(client: AppSupabaseClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(SupabaseProvider, { client, children });
  };
}

describe("useSession", () => {
  it("starts loading, then resolves the initial session", async () => {
    const { client } = fakeClient({ user: { id: "u1" } });
    const { result } = renderHook(() => useSession(), {
      wrapper: wrapperFor(client),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user?.id).toBe("u1");
    expect(result.current.session).toEqual({ user: { id: "u1" } });
  });

  it("resolves to a null user when there is no session", async () => {
    const { client } = fakeClient(null);
    const { result } = renderHook(() => useSession(), {
      wrapper: wrapperFor(client),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it("reflects auth state changes pushed after the initial load", async () => {
    const { client, emit } = fakeClient(null);
    const { result } = renderHook(() => useSession(), {
      wrapper: wrapperFor(client),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeNull();

    act(() => {
      emit({ user: { id: "u2" } });
    });

    expect(result.current.user?.id).toBe("u2");
  });

  it("unsubscribes from auth state changes on unmount", async () => {
    const { client, unsubscribe } = fakeClient(null);
    const { result, unmount } = renderHook(() => useSession(), {
      wrapper: wrapperFor(client),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(unsubscribe).not.toHaveBeenCalled();

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
