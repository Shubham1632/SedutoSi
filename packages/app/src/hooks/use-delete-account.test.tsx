// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createFakeSupabase } from "../test-utils/fake-supabase";
import { withSupabaseProvider } from "../test-utils/render";
import { useDeleteAccount } from "./use-delete-account";

describe("useDeleteAccount", () => {
  it("invokes the delete-account edge function, then signs out locally", async () => {
    const signOut = vi.fn(() => ({ error: null }));
    const invoke = vi.fn(() => ({ error: null }));
    const { client } = createFakeSupabase({
      session: { user: { id: "user-1" } },
      auth: { signOut },
      functions: { "delete-account": invoke },
    });

    const { result } = renderHook(() => useDeleteAccount(), {
      wrapper: withSupabaseProvider(client),
    });

    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invoke).toHaveBeenCalled();
    expect(signOut).toHaveBeenCalled();
  });

  it("rejects without calling the edge function when there is no session", async () => {
    const invoke = vi.fn();
    const { client } = createFakeSupabase({
      session: null,
      functions: { "delete-account": invoke },
    });

    const { result } = renderHook(() => useDeleteAccount(), {
      wrapper: withSupabaseProvider(client),
    });

    result.current.mutate();
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe("Not authenticated");
    expect(invoke).not.toHaveBeenCalled();
  });

  it("surfaces an edge function error without signing out", async () => {
    const signOut = vi.fn(() => ({ error: null }));
    const { client } = createFakeSupabase({
      session: { user: { id: "user-1" } },
      auth: { signOut },
      functions: {
        "delete-account": () => ({ error: new Error("still has bookings") }),
      },
    });

    const { result } = renderHook(() => useDeleteAccount(), {
      wrapper: withSupabaseProvider(client),
    });

    result.current.mutate();
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(signOut).not.toHaveBeenCalled();
  });
});
