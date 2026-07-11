// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useSession } from "@acme/api";

import { createFakeSupabase } from "../test-utils/fake-supabase";
import {
  createTestQueryClient,
  withSupabaseProvider,
} from "../test-utils/render";
import { useToggleWishlist, useWishlist } from "./use-wishlist";

/** Mounts useToggleWishlist alongside useSession so tests can wait for the
 * (async) session to resolve before mutating — the mutation's query key is
 * keyed by user id, so mutating too early would target the wrong cache key. */
function useToggleWishlistReady() {
  const session = useSession();
  const toggle = useToggleWishlist();
  return { ready: !session.isLoading && !!session.user, toggle };
}

const USER_ID = "user-1";
const session = { user: { id: USER_ID } };

describe("useWishlist", () => {
  it("fetches the signed-in user's wishlist, newest first", async () => {
    const { client } = createFakeSupabase({
      session,
      tables: {
        wishlist: (query) => {
          expect(query.filters.find((f) => f.method === "eq")?.args).toEqual([
            "user_id",
            USER_ID,
          ]);
          return {
            data: [
              {
                id: "w1",
                user_id: USER_ID,
                movie_id: "m1",
                created_at: "2026-01-01T00:00:00.000Z",
              },
            ],
            error: null,
          };
        },
      },
    });

    const { result } = renderHook(() => useWishlist(), {
      wrapper: withSupabaseProvider(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]?.movie_id).toBe("m1");
  });

  it("does not query when signed out", () => {
    const { client, calls } = createFakeSupabase({ session: null, tables: {} });

    const { result } = renderHook(() => useWishlist(), {
      wrapper: withSupabaseProvider(client),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(calls).toHaveLength(0);
  });
});

describe("useToggleWishlist", () => {
  it("optimistically adds a placeholder row before the insert resolves", async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(["wishlist", USER_ID], []);

    const { client } = createFakeSupabase({
      session,
      tables: {
        wishlist: () => ({ data: null, error: null }),
      },
    });

    const { result } = renderHook(() => useToggleWishlistReady(), {
      wrapper: withSupabaseProvider(client, queryClient),
    });

    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => {
      result.current.toggle.mutate({ movieId: "m1", wishlisted: true });
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData<{ movie_id: string }[]>([
        "wishlist",
        USER_ID,
      ]);
      expect(cached).toHaveLength(1);
      expect(cached?.[0]?.movie_id).toBe("m1");
    });

    await waitFor(() => expect(result.current.toggle.isSuccess).toBe(true));
  });

  it("optimistically removes a row when un-wishlisting", async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(
      ["wishlist", USER_ID],
      [{ id: "w1", user_id: USER_ID, movie_id: "m1", created_at: "now" }],
    );

    const { client } = createFakeSupabase({
      session,
      tables: {
        wishlist: () => ({ data: null, error: null }),
      },
    });

    const { result } = renderHook(() => useToggleWishlistReady(), {
      wrapper: withSupabaseProvider(client, queryClient),
    });

    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => {
      result.current.toggle.mutate({ movieId: "m1", wishlisted: false });
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData<unknown[]>(["wishlist", USER_ID]);
      expect(cached).toEqual([]);
    });
  });

  it("rolls back the optimistic update when the mutation fails", async () => {
    const queryClient = createTestQueryClient();
    const original = [
      { id: "w1", user_id: USER_ID, movie_id: "m9", created_at: "now" },
    ];
    queryClient.setQueryData(["wishlist", USER_ID], original);

    const { client } = createFakeSupabase({
      session,
      tables: {
        wishlist: () => ({ data: null, error: new Error("insert failed") }),
      },
    });

    const { result } = renderHook(() => useToggleWishlistReady(), {
      wrapper: withSupabaseProvider(client, queryClient),
    });

    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => {
      result.current.toggle.mutate({ movieId: "m1", wishlisted: true });
    });

    await waitFor(() => expect(result.current.toggle.isError).toBe(true));

    expect(queryClient.getQueryData(["wishlist", USER_ID])).toEqual(original);
  });
});
