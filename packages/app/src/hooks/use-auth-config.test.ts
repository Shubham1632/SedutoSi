import { describe, expect, it } from "vitest";

import { DEFAULT_AUTH_SETTINGS } from "../auth-settings";
import { useAuthConfig } from "./use-auth-config";

describe("useAuthConfig", () => {
  it("returns the kit default auth settings", () => {
    expect(useAuthConfig()).toBe(DEFAULT_AUTH_SETTINGS);
  });
});
