import { getQueryParams } from "expo-auth-session/build/QueryParams";
import { openAuthSessionAsync } from "expo-web-browser";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { signInWithOAuth, syncOAuthAvatar } from "@acme/app";

import { supabase } from "~/lib/supabase";
import { signInWithGoogle } from "./google-auth";

vi.mock("expo-constants", () => ({
  default: { expoConfig: { hostUri: "192.168.1.5:8081" }, manifest: undefined },
}));
vi.mock("expo-web-browser", () => ({
  openAuthSessionAsync: vi.fn(),
}));
vi.mock("expo-auth-session/build/QueryParams", () => ({
  getQueryParams: vi.fn(),
}));
vi.mock("@acme/app", () => ({
  signInWithOAuth: vi.fn(),
  syncOAuthAvatar: vi.fn(),
}));
vi.mock("~/lib/supabase", () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: vi.fn(),
      setSession: vi.fn(),
    },
  },
}));

const mockSignInWithOAuth = vi.mocked(signInWithOAuth);
const mockSyncOAuthAvatar = vi.mocked(syncOAuthAvatar);
const mockOpenAuthSessionAsync = vi.mocked(openAuthSessionAsync);
const mockGetQueryParams = vi.mocked(getQueryParams);
// supabase.auth's methods are plain vi.fn() mocks (see the module mock above),
// not real bound class methods, so detaching them here is safe despite the
// lint rule's generic "this" concern.
/* eslint-disable @typescript-eslint/unbound-method */
const mockExchangeCodeForSession = vi.mocked(
  supabase.auth.exchangeCodeForSession,
);
const mockSetSession = vi.mocked(supabase.auth.setSession);
/* eslint-enable @typescript-eslint/unbound-method */

beforeEach(() => {
  vi.clearAllMocks();
  mockSignInWithOAuth.mockResolvedValue({
    data: { url: "https://accounts.google.com/oauth" },
    error: null,
  } as never);
  mockSyncOAuthAvatar.mockResolvedValue(undefined);
});

describe("signInWithGoogle", () => {
  it("throws when Supabase's OAuth request errors", async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: new Error("oauth misconfigured"),
    } as never);

    await expect(signInWithGoogle()).rejects.toThrow("oauth misconfigured");
  });

  it("throws when no OAuth URL comes back", async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: null,
    } as never);

    await expect(signInWithGoogle()).rejects.toThrow(
      "Google sign-in did not return a URL.",
    );
  });

  it("returns cancelled when the browser session doesn't succeed", async () => {
    mockOpenAuthSessionAsync.mockResolvedValue({ type: "cancel" } as never);

    await expect(signInWithGoogle()).resolves.toBe("cancelled");
  });

  it("throws the provider's error code from the redirect", async () => {
    mockOpenAuthSessionAsync.mockResolvedValue({
      type: "success",
      url: "exp://x?error=access_denied",
    } as never);
    mockGetQueryParams.mockReturnValue({
      errorCode: "access_denied",
      params: {},
    } as never);

    await expect(signInWithGoogle()).rejects.toThrow("access_denied");
  });

  it("throws the provider's error_description when there's no error code", async () => {
    mockOpenAuthSessionAsync.mockResolvedValue({
      type: "success",
      url: "exp://x",
    } as never);
    mockGetQueryParams.mockReturnValue({
      errorCode: undefined,
      params: { error_description: "user denied access" },
    } as never);

    await expect(signInWithGoogle()).rejects.toThrow("user denied access");
  });

  it("exchanges the auth code for a session and syncs the avatar", async () => {
    mockOpenAuthSessionAsync.mockResolvedValue({
      type: "success",
      url: "exp://x?code=abc123",
    } as never);
    mockGetQueryParams.mockReturnValue({
      errorCode: undefined,
      params: { code: "abc123" },
    } as never);
    mockExchangeCodeForSession.mockResolvedValue({ error: null } as never);

    await expect(signInWithGoogle()).resolves.toBe("success");
    expect(mockExchangeCodeForSession).toHaveBeenCalledWith("abc123");
    expect(mockSyncOAuthAvatar).toHaveBeenCalledWith(supabase);
  });

  it("throws when the code exchange fails", async () => {
    mockOpenAuthSessionAsync.mockResolvedValue({
      type: "success",
      url: "exp://x?code=abc123",
    } as never);
    mockGetQueryParams.mockReturnValue({
      errorCode: undefined,
      params: { code: "abc123" },
    } as never);
    mockExchangeCodeForSession.mockResolvedValue({
      error: new Error("invalid code"),
    } as never);

    await expect(signInWithGoogle()).rejects.toThrow("invalid code");
    expect(mockSyncOAuthAvatar).not.toHaveBeenCalled();
  });

  it("falls back to an implicit access/refresh token pair when there's no code", async () => {
    mockOpenAuthSessionAsync.mockResolvedValue({
      type: "success",
      url: "exp://x#access_token=at&refresh_token=rt",
    } as never);
    mockGetQueryParams.mockReturnValue({
      errorCode: undefined,
      params: { access_token: "at", refresh_token: "rt" },
    } as never);
    mockSetSession.mockResolvedValue({ error: null } as never);

    await expect(signInWithGoogle()).resolves.toBe("success");
    expect(mockSetSession).toHaveBeenCalledWith({
      access_token: "at",
      refresh_token: "rt",
    });
  });

  it("throws when setSession fails for the implicit flow", async () => {
    mockOpenAuthSessionAsync.mockResolvedValue({
      type: "success",
      url: "exp://x#access_token=at&refresh_token=rt",
    } as never);
    mockGetQueryParams.mockReturnValue({
      errorCode: undefined,
      params: { access_token: "at", refresh_token: "rt" },
    } as never);
    mockSetSession.mockResolvedValue({
      error: new Error("bad token"),
    } as never);

    await expect(signInWithGoogle()).rejects.toThrow("bad token");
  });

  it("throws when the redirect carries neither a code nor tokens", async () => {
    mockOpenAuthSessionAsync.mockResolvedValue({
      type: "success",
      url: "exp://x",
    } as never);
    mockGetQueryParams.mockReturnValue({
      errorCode: undefined,
      params: {},
    } as never);

    await expect(signInWithGoogle()).rejects.toThrow(
      "Google sign-in did not return a session.",
    );
  });

  it("still succeeds when the best-effort avatar sync fails", async () => {
    mockOpenAuthSessionAsync.mockResolvedValue({
      type: "success",
      url: "exp://x?code=abc123",
    } as never);
    mockGetQueryParams.mockReturnValue({
      errorCode: undefined,
      params: { code: "abc123" },
    } as never);
    mockExchangeCodeForSession.mockResolvedValue({ error: null } as never);
    mockSyncOAuthAvatar.mockRejectedValue(new Error("avatar sync failed"));

    await expect(signInWithGoogle()).resolves.toBe("success");
  });
});
