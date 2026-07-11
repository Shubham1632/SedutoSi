// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSession } from "@acme/api";

import { createFakeSupabase } from "../test-utils/fake-supabase";
import { withSupabaseProvider } from "../test-utils/render";
import { useUploadEventImage } from "./use-event-image-upload";

const USER_ID = "user-1";
const session = { user: { id: USER_ID } };

function useUploadEventImageReady() {
  const s = useSession();
  const upload = useUploadEventImage();
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

describe("useUploadEventImage", () => {
  it("uploads to a per-user, unique, upsert-false path and returns the plain public URL", async () => {
    const uploadSpy = vi.fn(
      (
        _path: string,
        _body: unknown,
        _opts: { contentType: string; upsert: boolean },
      ) => ({
        data: null,
        error: null,
      }),
    );
    const { client } = createFakeSupabase({
      session,
      storage: {
        "event-images": {
          upload: uploadSpy,
          getPublicUrl: () => ({
            data: { publicUrl: "https://cdn/event-images/user-1/x.jpg" },
          }),
        },
      },
    });

    const { result } = renderHook(() => useUploadEventImageReady(), {
      wrapper: withSupabaseProvider(client),
    });
    await waitFor(() => expect(result.current.ready).toBe(true));

    result.current.upload.mutate({ uri: "file:///cover.jpg" });
    await waitFor(() => expect(result.current.upload.isSuccess).toBe(true));

    const call = uploadSpy.mock.calls[0];
    if (!call) throw new Error("upload was not called");
    const [path, , opts] = call;
    expect(path).toMatch(/^user-1\/\d+-[a-z0-9]+\.jpg$/);
    expect(opts).toEqual({ contentType: "image/jpeg", upsert: false });
    // No cache-busting query param — accumulating images don't need it.
    expect(result.current.upload.data).toBe(
      "https://cdn/event-images/user-1/x.jpg",
    );
  });

  it("generates a different path on each call (never overwrites)", async () => {
    const uploadSpy = vi.fn(
      (
        _path: string,
        _body: unknown,
        _opts: { contentType: string; upsert: boolean },
      ) => ({
        data: null,
        error: null,
      }),
    );
    const { client } = createFakeSupabase({
      session,
      storage: {
        "event-images": {
          upload: uploadSpy,
          getPublicUrl: () => ({ data: { publicUrl: "https://cdn/x" } }),
        },
      },
    });

    const { result } = renderHook(() => useUploadEventImageReady(), {
      wrapper: withSupabaseProvider(client),
    });
    await waitFor(() => expect(result.current.ready).toBe(true));

    result.current.upload.mutate({ uri: "file:///a.jpg" });
    await waitFor(() => expect(result.current.upload.isSuccess).toBe(true));
    result.current.upload.mutate({ uri: "file:///b.jpg" });
    await waitFor(() => expect(uploadSpy).toHaveBeenCalledTimes(2));

    const callA = uploadSpy.mock.calls[0];
    const callB = uploadSpy.mock.calls[1];
    if (!callA || !callB) throw new Error("upload was not called twice");
    expect(callA[0]).not.toBe(callB[0]);
  });

  it("rejects when there is no signed-in user", async () => {
    const { client } = createFakeSupabase({ session: null, storage: {} });
    const { result } = renderHook(() => useUploadEventImage(), {
      wrapper: withSupabaseProvider(client),
    });

    result.current.mutate({ uri: "file:///cover.jpg" });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Not signed in");
  });
});
