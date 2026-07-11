// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSession } from "@acme/api";

import { createFakeSupabase } from "../test-utils/fake-supabase";
import { withSupabaseProvider } from "../test-utils/render";
import { useUploadAvatar } from "./use-avatar-upload";

const USER_ID = "user-1";
const session = { user: { id: USER_ID } };

function useUploadAvatarReady() {
  const s = useSession();
  const upload = useUploadAvatar();
  return { ready: !s.isLoading && !!s.user, upload };
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      }),
    ),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useUploadAvatar", () => {
  it("uploads to a per-user, upsert-true path and returns a cache-busted URL", async () => {
    const uploadSpy = vi.fn(() => ({ data: null, error: null }));
    const { client } = createFakeSupabase({
      session,
      storage: {
        avatars: {
          upload: uploadSpy,
          getPublicUrl: () => ({
            data: { publicUrl: "https://cdn/avatars/user-1/avatar.png" },
          }),
        },
      },
    });

    const { result } = renderHook(() => useUploadAvatarReady(), {
      wrapper: withSupabaseProvider(client),
    });
    await waitFor(() => expect(result.current.ready).toBe(true));

    result.current.upload.mutate({ uri: "file:///photo.png" });
    await waitFor(() => expect(result.current.upload.isSuccess).toBe(true));

    expect(uploadSpy).toHaveBeenCalledWith(
      "user-1/avatar.png",
      expect.any(ArrayBuffer),
      { contentType: "image/jpeg", upsert: true },
    );
    expect(result.current.upload.data).toMatch(
      /^https:\/\/cdn\/avatars\/user-1\/avatar\.png\?v=\d+$/,
    );
  });

  it("falls back to a jpg extension when the URI has none", async () => {
    const uploadSpy = vi.fn(() => ({ data: null, error: null }));
    const { client } = createFakeSupabase({
      session,
      storage: {
        avatars: {
          upload: uploadSpy,
          getPublicUrl: () => ({ data: { publicUrl: "https://cdn/x" } }),
        },
      },
    });

    const { result } = renderHook(() => useUploadAvatarReady(), {
      wrapper: withSupabaseProvider(client),
    });
    await waitFor(() => expect(result.current.ready).toBe(true));

    result.current.upload.mutate({ uri: "content://media/no-extension" });
    await waitFor(() => expect(result.current.upload.isSuccess).toBe(true));

    expect(uploadSpy).toHaveBeenCalledWith(
      "user-1/avatar.jpg",
      expect.anything(),
      expect.anything(),
    );
  });

  it("rejects when there is no signed-in user", async () => {
    const { client } = createFakeSupabase({ session: null, storage: {} });
    const { result } = renderHook(() => useUploadAvatar(), {
      wrapper: withSupabaseProvider(client),
    });

    result.current.mutate({ uri: "file:///photo.png" });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Not signed in");
  });

  it("propagates a storage upload error", async () => {
    const boom = new Error("bucket full");
    const { client } = createFakeSupabase({
      session,
      storage: { avatars: { upload: () => ({ data: null, error: boom }) } },
    });

    const { result } = renderHook(() => useUploadAvatarReady(), {
      wrapper: withSupabaseProvider(client),
    });
    await waitFor(() => expect(result.current.ready).toBe(true));

    result.current.upload.mutate({ uri: "file:///photo.png" });
    await waitFor(() => expect(result.current.upload.isError).toBe(true));
  });
});
