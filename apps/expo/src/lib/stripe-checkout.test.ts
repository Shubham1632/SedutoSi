import { getQueryParams } from "expo-auth-session/build/QueryParams";
import Constants from "expo-constants";
import { openAuthSessionAsync } from "expo-web-browser";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getStripeRedirectTo, openStripeCheckout } from "./stripe-checkout";

vi.mock("expo-constants", () => ({
  default: { expoConfig: undefined, manifest: undefined },
}));
vi.mock("expo-web-browser", () => ({
  openAuthSessionAsync: vi.fn(),
}));
vi.mock("expo-auth-session/build/QueryParams", () => ({
  getQueryParams: vi.fn(),
}));

const mockOpenAuthSessionAsync = vi.mocked(openAuthSessionAsync);
const mockGetQueryParams = vi.mocked(getQueryParams);
const mockConstants = Constants as unknown as {
  expoConfig?: { hostUri?: string };
  manifest?: { debuggerHost?: string };
};

beforeEach(() => {
  mockConstants.expoConfig = undefined;
  mockConstants.manifest = undefined;
  mockOpenAuthSessionAsync.mockReset();
  mockGetQueryParams.mockReset();
});

describe("getStripeRedirectTo", () => {
  it("uses expoConfig.hostUri when present", () => {
    mockConstants.expoConfig = { hostUri: "192.168.1.5:8081" };
    expect(getStripeRedirectTo()).toBe("exp://192.168.1.5:8081");
  });

  it("falls back to manifest.debuggerHost when expoConfig has none", () => {
    mockConstants.manifest = { debuggerHost: "192.168.1.9:8081" };
    expect(getStripeRedirectTo()).toBe("exp://192.168.1.9:8081");
  });
});

describe("openStripeCheckout", () => {
  it("returns cancel when the browser session doesn't succeed", async () => {
    mockOpenAuthSessionAsync.mockResolvedValue({ type: "cancel" } as never);

    const result = await openStripeCheckout("https://checkout", "exp://x");
    expect(result).toEqual({ status: "cancel" });
    expect(mockGetQueryParams).not.toHaveBeenCalled();
  });

  it("returns success with the session id when the redirect carries one", async () => {
    mockOpenAuthSessionAsync.mockResolvedValue({
      type: "success",
      url: "exp://x?status=success&session_id=sess_123",
    } as never);
    mockGetQueryParams.mockReturnValue({
      params: { status: "success", session_id: "sess_123" },
    } as never);

    const result = await openStripeCheckout("https://checkout", "exp://x");
    expect(result).toEqual({ status: "success", sessionId: "sess_123" });
  });

  it("returns cancel when the redirect succeeds but carries no session id", async () => {
    mockOpenAuthSessionAsync.mockResolvedValue({
      type: "success",
      url: "exp://x?status=cancel",
    } as never);
    mockGetQueryParams.mockReturnValue({
      params: { status: "cancel" },
    } as never);

    const result = await openStripeCheckout("https://checkout", "exp://x");
    expect(result).toEqual({ status: "cancel" });
  });

  it("returns cancel when session_id is present but not a string", async () => {
    mockOpenAuthSessionAsync.mockResolvedValue({
      type: "success",
      url: "exp://x?status=success",
    } as never);
    mockGetQueryParams.mockReturnValue({
      params: { status: "success", session_id: undefined },
    } as never);

    const result = await openStripeCheckout("https://checkout", "exp://x");
    expect(result).toEqual({ status: "cancel" });
  });
});
