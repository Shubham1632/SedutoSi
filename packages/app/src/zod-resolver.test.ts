import { describe, expect, it } from "vitest";
import { z } from "zod/v4";

import { zodFormResolver } from "./zod-resolver";

const schema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(6, "Use at least 6 characters"),
});

describe("zodFormResolver", () => {
  it("returns the parsed values with no errors when valid", async () => {
    const resolver = zodFormResolver(schema);
    const result = await resolver(
      { email: "a@b.com", password: "secret1" },
      undefined,
      { fields: {}, shouldUseNativeValidation: false },
    );
    expect(result.errors).toEqual({});
    expect(result.values).toEqual({ email: "a@b.com", password: "secret1" });
  });

  it("maps each top-level issue to react-hook-form's flat error shape", async () => {
    const resolver = zodFormResolver(schema);
    const result = await resolver(
      { email: "not-an-email", password: "x" },
      undefined,
      { fields: {}, shouldUseNativeValidation: false },
    );
    expect(result.values).toEqual({});
    expect(Object.keys(result.errors)).toEqual(
      expect.arrayContaining(["email", "password"]),
    );
    expect(result.errors.email?.message).toBe("Enter a valid email");
    expect(result.errors.password?.message).toBe("Use at least 6 characters");
  });

  it("keeps only the first issue per field", async () => {
    // A schema where a single field can fail two refinements at once.
    const multiIssueSchema = z.object({
      code: z
        .string()
        .min(4, "Too short")
        .refine((v) => v !== "aaaa", { message: "Reserved code" }),
    });
    const resolver = zodFormResolver(multiIssueSchema);
    const result = await resolver({ code: "aaaa" }, undefined, {
      fields: {},
      shouldUseNativeValidation: false,
    });
    expect(Object.keys(result.errors)).toEqual(["code"]);
    expect(result.errors.code?.message).toBe("Reserved code");
  });

  it("ignores issues without a string path (root-level refine errors)", async () => {
    const rootSchema = z
      .object({ a: z.string(), b: z.string() })
      .refine((d) => d.a === d.b, { message: "Must match" });
    const resolver = zodFormResolver(rootSchema);
    const result = await resolver({ a: "x", b: "y" }, undefined, {
      fields: {},
      shouldUseNativeValidation: false,
    });
    // The refine's issue has an empty path, so it can't be mapped onto a
    // specific field and is dropped rather than crashing.
    expect(result.errors).toEqual({});
  });
});
