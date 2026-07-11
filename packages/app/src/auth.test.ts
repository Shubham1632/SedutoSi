import { describe, expect, it, vi } from "vitest";

import {
  signInWithOAuth,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  syncOAuthAvatar,
  verifySignUpCode,
} from "./auth";
import { createFakeSupabase } from "./test-utils/fake-supabase";

const boom = new Error("boom");

describe("signInWithPassword", () => {
  it("resolves on success", async () => {
    const spy = vi.fn(() => ({ error: null }));
    const { client } = createFakeSupabase({
      auth: { signInWithPassword: spy },
    });

    await expect(
      signInWithPassword(client, { email: "a@b.com", password: "secret1" }),
    ).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "secret1",
      options: undefined,
    });
  });

  it("passes a captcha token through options", async () => {
    const spy = vi.fn(() => ({ error: null }));
    const { client } = createFakeSupabase({
      auth: { signInWithPassword: spy },
    });

    await signInWithPassword(
      client,
      { email: "a@b.com", password: "secret1" },
      { captchaToken: "tok" },
    );
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ options: { captchaToken: "tok" } }),
    );
  });

  it("throws the Supabase error", async () => {
    const { client } = createFakeSupabase({
      auth: { signInWithPassword: () => ({ error: boom }) },
    });
    await expect(
      signInWithPassword(client, { email: "a@b.com", password: "secret1" }),
    ).rejects.toThrow("boom");
  });
});

describe("signUpWithPassword", () => {
  it("returns the signUp data on success", async () => {
    const data = { user: { id: "u1" }, session: null };
    const { client } = createFakeSupabase({
      auth: { signUp: () => ({ data, error: null }) },
    });
    await expect(
      signUpWithPassword(client, { email: "a@b.com", password: "secret1" }),
    ).resolves.toEqual(data);
  });

  it("forwards displayName as user_metadata", async () => {
    const spy = vi.fn(() => ({
      data: { user: null, session: null },
      error: null,
    }));
    const { client } = createFakeSupabase({ auth: { signUp: spy } });
    await signUpWithPassword(client, {
      email: "a@b.com",
      password: "secret1",
      displayName: "Ada",
    });
    expect(spy).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "secret1",
      options: {
        data: { display_name: "Ada" },
        emailRedirectTo: undefined,
        captchaToken: undefined,
      },
    });
  });

  it("throws the Supabase error", async () => {
    const { client } = createFakeSupabase({
      auth: { signUp: () => ({ data: null, error: boom }) },
    });
    await expect(
      signUpWithPassword(client, { email: "a@b.com", password: "secret1" }),
    ).rejects.toThrow("boom");
  });
});

describe("verifySignUpCode", () => {
  it("verifies with type signup", async () => {
    const spy = vi.fn(() => ({ error: null }));
    const { client } = createFakeSupabase({ auth: { verifyOtp: spy } });
    await verifySignUpCode(client, "a@b.com", "123456");
    expect(spy).toHaveBeenCalledWith({
      email: "a@b.com",
      token: "123456",
      type: "signup",
    });
  });

  it("throws on error", async () => {
    const { client } = createFakeSupabase({
      auth: { verifyOtp: () => ({ error: boom }) },
    });
    await expect(verifySignUpCode(client, "a@b.com", "000000")).rejects.toThrow(
      "boom",
    );
  });
});

describe("signInWithOAuth", () => {
  it("passes provider and options through and returns the result", () => {
    const returned = { data: { url: "https://provider/auth" }, error: null };
    const spy = vi.fn(() => returned);
    const { client } = createFakeSupabase({ auth: { signInWithOAuth: spy } });

    const result = signInWithOAuth(client, "google", {
      redirectTo: "https://app/callback",
      skipBrowserRedirect: true,
    });

    expect(spy).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "https://app/callback",
        skipBrowserRedirect: true,
      },
    });
    expect(result).toBe(returned);
  });
});

describe("signOut", () => {
  it("resolves on success", async () => {
    const { client } = createFakeSupabase({
      auth: { signOut: () => ({ error: null }) },
    });
    await expect(signOut(client)).resolves.toBeUndefined();
  });

  it("throws on error", async () => {
    const { client } = createFakeSupabase({
      auth: { signOut: () => ({ error: boom }) },
    });
    await expect(signOut(client)).rejects.toThrow("boom");
  });
});

describe("syncOAuthAvatar", () => {
  it("does nothing when there is no user", async () => {
    const { client, calls } = createFakeSupabase({
      auth: { getUser: () => ({ data: { user: null } }) },
    });
    await syncOAuthAvatar(client);
    expect(calls).toHaveLength(0);
  });

  it("does nothing when the provider gave no avatar", async () => {
    const { client, calls } = createFakeSupabase({
      auth: {
        getUser: () => ({
          data: { user: { id: "u1", user_metadata: {} } },
        }),
      },
    });
    await syncOAuthAvatar(client);
    expect(calls).toHaveLength(0);
  });

  it("skips the update when the profile already has an avatar", async () => {
    const update = vi.fn();
    const { client } = createFakeSupabase({
      auth: {
        getUser: () => ({
          data: {
            user: {
              id: "u1",
              user_metadata: { avatar_url: "https://provider/pic.jpg" },
            },
          },
        }),
      },
      tables: {
        profiles: (query) => {
          if (query.op === "update") {
            update(query.payload);
            return { data: null, error: null };
          }
          return {
            data: { avatar_url: "https://existing/pic.jpg" },
            error: null,
          };
        },
      },
    });

    await syncOAuthAvatar(client);
    expect(update).not.toHaveBeenCalled();
  });

  it("writes the provider avatar when the profile has none, falling back to `picture`", async () => {
    const update = vi.fn();
    const { client } = createFakeSupabase({
      auth: {
        getUser: () => ({
          data: {
            user: {
              id: "u1",
              user_metadata: { picture: "https://provider/pic.jpg" },
            },
          },
        }),
      },
      tables: {
        profiles: (query) => {
          if (query.op === "update") {
            update(query.payload);
            return { data: null, error: null };
          }
          return { data: { avatar_url: null }, error: null };
        },
      },
    });

    await syncOAuthAvatar(client);
    expect(update).toHaveBeenCalledWith({
      avatar_url: "https://provider/pic.jpg",
    });
  });
});
