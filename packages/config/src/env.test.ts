import { describe, expect, it } from "vitest";

import { parseClientEnv } from "./env";

describe("clientEnvSchema", () => {
  it("validates the client-safe subset", () => {
    const env = parseClientEnv({
      SUPABASE_URL: "https://abc.supabase.co",
      SUPABASE_ANON_KEY: "anon",
      APP_URL: "https://example.com",
    });
    expect(env.SUPABASE_ANON_KEY).toBe("anon");
  });

  it("rejects a missing anon key", () => {
    expect(() =>
      parseClientEnv({
        SUPABASE_URL: "https://abc.supabase.co",
        SUPABASE_ANON_KEY: "",
        APP_URL: "https://example.com",
      }),
    ).toThrow(/SUPABASE_ANON_KEY/);
  });
});
