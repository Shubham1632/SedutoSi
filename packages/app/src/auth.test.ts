import { describe, expect, it, vi } from "vitest";

import {
  convertAnonToPermanent,
  ensureAnonSession,
  isAnonymousUser,
  resendSignUpEmail,
  resetPasswordForEmail,
  signInWithOAuth,
  signInWithOtp,
  signInWithPassword,
  signInWithSSO,
  signOut,
  signUpWithPassword,
  syncOAuthAvatar,
  updatePassword,
  verifyEmailLoginCode,
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

describe("verifyEmailLoginCode", () => {
  it("verifies with type email", async () => {
    const spy = vi.fn(() => ({ error: null }));
    const { client } = createFakeSupabase({ auth: { verifyOtp: spy } });
    await verifyEmailLoginCode(client, "a@b.com", "123456");
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ type: "email" }),
    );
  });

  it("throws on error", async () => {
    const { client } = createFakeSupabase({
      auth: { verifyOtp: () => ({ error: boom }) },
    });
    await expect(
      verifyEmailLoginCode(client, "a@b.com", "000000"),
    ).rejects.toThrow("boom");
  });
});

describe("resendSignUpEmail", () => {
  it("resends with type signup", async () => {
    const spy = vi.fn(() => ({ error: null }));
    const { client } = createFakeSupabase({ auth: { resend: spy } });
    await resendSignUpEmail(client, "a@b.com", {
      emailRedirectTo: "https://x/y",
    });
    expect(spy).toHaveBeenCalledWith({
      type: "signup",
      email: "a@b.com",
      options: { emailRedirectTo: "https://x/y" },
    });
  });

  it("throws on error", async () => {
    const { client } = createFakeSupabase({
      auth: { resend: () => ({ error: boom }) },
    });
    await expect(resendSignUpEmail(client, "a@b.com")).rejects.toThrow("boom");
  });
});

describe("signInWithOtp", () => {
  it("resolves on success", async () => {
    const spy = vi.fn(() => ({ error: null }));
    const { client } = createFakeSupabase({ auth: { signInWithOtp: spy } });
    await signInWithOtp(client, "a@b.com");
    expect(spy).toHaveBeenCalled();
  });

  it("throws on error", async () => {
    const { client } = createFakeSupabase({
      auth: { signInWithOtp: () => ({ error: boom }) },
    });
    await expect(signInWithOtp(client, "a@b.com")).rejects.toThrow("boom");
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

describe("signInWithSSO", () => {
  it("uses providerId when given", () => {
    const spy = vi.fn(() => ({ data: { url: "https://sso" }, error: null }));
    const { client } = createFakeSupabase({ auth: { signInWithSSO: spy } });

    void signInWithSSO(client, { providerId: "prov-1" });
    expect(spy).toHaveBeenCalledWith({
      providerId: "prov-1",
      options: { redirectTo: undefined, skipBrowserRedirect: undefined },
    });
  });

  it("falls back to domain when no providerId is given", () => {
    const spy = vi.fn(() => ({ data: { url: "https://sso" }, error: null }));
    const { client } = createFakeSupabase({ auth: { signInWithSSO: spy } });

    void signInWithSSO(client, { domain: "acme.com" });
    expect(spy).toHaveBeenCalledWith({
      domain: "acme.com",
      options: { redirectTo: undefined, skipBrowserRedirect: undefined },
    });
  });

  it("defaults to an empty domain when neither is given", () => {
    const spy = vi.fn(() => ({ data: { url: "https://sso" }, error: null }));
    const { client } = createFakeSupabase({ auth: { signInWithSSO: spy } });

    void signInWithSSO(client, {});
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ domain: "" }));
  });
});

describe("resetPasswordForEmail", () => {
  it("resolves on success", async () => {
    const spy = vi.fn(() => ({ error: null }));
    const { client } = createFakeSupabase({
      auth: { resetPasswordForEmail: spy },
    });
    await resetPasswordForEmail(client, "a@b.com", "https://app/reset");
    expect(spy).toHaveBeenCalledWith("a@b.com", {
      redirectTo: "https://app/reset",
      captchaToken: undefined,
    });
  });

  it("throws on error", async () => {
    const { client } = createFakeSupabase({
      auth: { resetPasswordForEmail: () => ({ error: boom }) },
    });
    await expect(
      resetPasswordForEmail(client, "a@b.com", "https://app/reset"),
    ).rejects.toThrow("boom");
  });
});

describe("updatePassword", () => {
  it("resolves on success", async () => {
    const spy = vi.fn(() => ({ error: null }));
    const { client } = createFakeSupabase({ auth: { updateUser: spy } });
    await updatePassword(client, "new-secret");
    expect(spy).toHaveBeenCalledWith({ password: "new-secret" });
  });

  it("throws on error", async () => {
    const { client } = createFakeSupabase({
      auth: { updateUser: () => ({ error: boom }) },
    });
    await expect(updatePassword(client, "new-secret")).rejects.toThrow("boom");
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

describe("ensureAnonSession", () => {
  it("returns the existing user without minting a new session", async () => {
    const existingUser = { id: "u1", is_anonymous: false };
    const signInAnonymously = vi.fn();
    const { client } = createFakeSupabase({
      session: { user: existingUser },
      auth: { signInAnonymously },
    });

    await expect(ensureAnonSession(client)).resolves.toBe(existingUser);
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it("mints an anonymous session when signed out", async () => {
    const anonUser = { id: "anon-1", is_anonymous: true };
    const { client } = createFakeSupabase({
      session: null,
      auth: {
        signInAnonymously: () => ({ data: { user: anonUser }, error: null }),
      },
    });

    await expect(ensureAnonSession(client)).resolves.toBe(anonUser);
  });

  it("throws when the anonymous sign-in errors", async () => {
    const { client } = createFakeSupabase({
      session: null,
      auth: {
        signInAnonymously: () => ({ data: { user: null }, error: boom }),
      },
    });
    await expect(ensureAnonSession(client)).rejects.toThrow("boom");
  });

  it("throws when the anonymous sign-in returns no user", async () => {
    const { client } = createFakeSupabase({
      session: null,
      auth: {
        signInAnonymously: () => ({ data: { user: null }, error: null }),
      },
    });
    await expect(ensureAnonSession(client)).rejects.toThrow(
      "Anonymous sign-in returned no user.",
    );
  });
});

describe("isAnonymousUser", () => {
  it("is true for an anonymous user", () => {
    expect(isAnonymousUser({ is_anonymous: true } as never)).toBe(true);
  });

  it("is false for a permanent user", () => {
    expect(isAnonymousUser({ is_anonymous: false } as never)).toBe(false);
  });

  it("is false for null/undefined", () => {
    expect(isAnonymousUser(null)).toBe(false);
    expect(isAnonymousUser(undefined)).toBe(false);
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

describe("convertAnonToPermanent", () => {
  it("resolves on success", async () => {
    const spy = vi.fn(() => ({ error: null }));
    const { client } = createFakeSupabase({ auth: { updateUser: spy } });
    await convertAnonToPermanent(client, "a@b.com");
    expect(spy).toHaveBeenCalledWith(
      { email: "a@b.com", data: undefined },
      undefined,
    );
  });

  it("passes emailRedirectTo and metadata through", async () => {
    const spy = vi.fn(() => ({ error: null }));
    const { client } = createFakeSupabase({ auth: { updateUser: spy } });
    await convertAnonToPermanent(client, "a@b.com", {
      emailRedirectTo: "https://app/confirm",
      data: { phone: "123" },
    });
    expect(spy).toHaveBeenCalledWith(
      { email: "a@b.com", data: { phone: "123" } },
      { emailRedirectTo: "https://app/confirm" },
    );
  });

  it("throws on error (e.g. email_exists)", async () => {
    const { client } = createFakeSupabase({
      auth: { updateUser: () => ({ error: boom }) },
    });
    await expect(convertAnonToPermanent(client, "a@b.com")).rejects.toThrow(
      "boom",
    );
  });
});
