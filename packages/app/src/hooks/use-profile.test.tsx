// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useSession } from "@acme/api";

import { createFakeSupabase } from "../test-utils/fake-supabase";
import { withSupabaseProvider } from "../test-utils/render";
import { useProfile, useUpdateProfile } from "./use-profile";

const USER_ID = "user-1";
const session = { user: { id: USER_ID } };

/** Waits for the (async) session to resolve before exercising a user-scoped
 * hook — otherwise the first render's query key would be keyed by `undefined`. */
function useProfileReady() {
  const s = useSession();
  const profile = useProfile();
  const update = useUpdateProfile();
  return { ready: !s.isLoading && !!s.user, profile, update };
}

describe("useProfile", () => {
  it("fetches the signed-in user's own profile row", async () => {
    const { client } = createFakeSupabase({
      session,
      tables: {
        profiles: (query) => {
          expect(query.single).toBe("single");
          expect(query.filters.find((f) => f.method === "eq")?.args).toEqual([
            "id",
            USER_ID,
          ]);
          return {
            data: { id: USER_ID, display_name: "Ada", avatar_url: null },
            error: null,
          };
        },
      },
    });

    const { result } = renderHook(() => useProfileReady(), {
      wrapper: withSupabaseProvider(client),
    });

    await waitFor(() => expect(result.current.profile.isSuccess).toBe(true));
    expect(result.current.profile.data).toEqual({
      id: USER_ID,
      display_name: "Ada",
      avatar_url: null,
    });
  });

  it("does not query when signed out", () => {
    const { client, calls } = createFakeSupabase({ session: null, tables: {} });
    const { result } = renderHook(() => useProfile(), {
      wrapper: withSupabaseProvider(client),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(calls).toHaveLength(0);
  });
});

describe("useUpdateProfile", () => {
  it("updates display name and avatar, then invalidates the profile query", async () => {
    const { client } = createFakeSupabase({
      session,
      tables: {
        profiles: (query) => {
          expect(query.op).toBe("update");
          expect(query.payload).toEqual({
            display_name: "Grace",
            avatar_url: "https://x/pic.jpg",
          });
          expect(query.filters.find((f) => f.method === "eq")?.args).toEqual([
            "id",
            USER_ID,
          ]);
          return {
            data: {
              id: USER_ID,
              display_name: "Grace",
              avatar_url: "https://x/pic.jpg",
            },
            error: null,
          };
        },
      },
    });

    const { result } = renderHook(() => useProfileReady(), {
      wrapper: withSupabaseProvider(client),
    });
    await waitFor(() => expect(result.current.ready).toBe(true));

    result.current.update.mutate({
      displayName: "Grace",
      avatarUrl: "https://x/pic.jpg",
    });

    await waitFor(() => expect(result.current.update.isSuccess).toBe(true));
  });

  it("clears the avatar when an empty string is given", async () => {
    const { client } = createFakeSupabase({
      session,
      tables: {
        profiles: (query) => {
          expect(query.payload).toEqual(
            expect.objectContaining({ avatar_url: null }),
          );
          return { data: { id: USER_ID }, error: null };
        },
      },
    });

    const { result } = renderHook(() => useProfileReady(), {
      wrapper: withSupabaseProvider(client),
    });
    await waitFor(() => expect(result.current.ready).toBe(true));

    result.current.update.mutate({ displayName: "Grace", avatarUrl: "" });
    await waitFor(() => expect(result.current.update.isSuccess).toBe(true));
  });
});
