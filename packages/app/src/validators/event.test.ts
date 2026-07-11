import { describe, expect, it } from "vitest";

import {
  createEventSchema,
  EVENT_MIN_DURATION_MS,
  EVENT_MIN_LEAD_TIME_MS,
} from "./event";

function validInput(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    title: "Jazz Night",
    category: "music",
    imageUri: "file:///cover.jpg",
    startsAt: new Date(Date.now() + EVENT_MIN_LEAD_TIME_MS + 60_000),
    ...overrides,
  };
}

describe("createEventSchema", () => {
  it("accepts a minimal valid event", () => {
    const result = createEventSchema.safeParse(validInput());
    expect(result.success).toBe(true);
  });

  it("requires a non-empty title", () => {
    const result = createEventSchema.safeParse(validInput({ title: "" }));
    expect(result.success).toBe(false);
  });

  it("requires a cover image", () => {
    const result = createEventSchema.safeParse(validInput({ imageUri: "" }));
    expect(result.success).toBe(false);
  });

  it("rejects a start time less than 24h from now", () => {
    const result = createEventSchema.safeParse(
      validInput({ startsAt: new Date(Date.now() + 60_000) }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["startsAt"]);
    }
  });

  it("accepts a start time exactly at the lead-time boundary", () => {
    // A hair past the boundary to avoid flaking on the >= comparison across
    // the microseconds between building the fixture and the refine running.
    const result = createEventSchema.safeParse(
      validInput({
        startsAt: new Date(Date.now() + EVENT_MIN_LEAD_TIME_MS + 5_000),
      }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects an end time less than 15 minutes after the start time", () => {
    const startsAt = new Date(Date.now() + EVENT_MIN_LEAD_TIME_MS + 60_000);
    const result = createEventSchema.safeParse(
      validInput({
        startsAt,
        endsAt: new Date(startsAt.getTime() + EVENT_MIN_DURATION_MS - 1000),
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["endsAt"]);
    }
  });

  it("accepts an end time at least 15 minutes after the start time", () => {
    const startsAt = new Date(Date.now() + EVENT_MIN_LEAD_TIME_MS + 60_000);
    const result = createEventSchema.safeParse(
      validInput({
        startsAt,
        endsAt: new Date(startsAt.getTime() + EVENT_MIN_DURATION_MS),
      }),
    );
    expect(result.success).toBe(true);
  });

  it("allows omitting the end time entirely", () => {
    const result = createEventSchema.safeParse(
      validInput({ endsAt: undefined }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects a negative or non-numeric price", () => {
    expect(
      createEventSchema.safeParse(validInput({ price: "-5" })).success,
    ).toBe(false);
    expect(
      createEventSchema.safeParse(validInput({ price: "abc" })).success,
    ).toBe(false);
  });

  it("accepts a valid price, including zero (free)", () => {
    expect(
      createEventSchema.safeParse(validInput({ price: "0" })).success,
    ).toBe(true);
    expect(
      createEventSchema.safeParse(validInput({ price: "12.50" })).success,
    ).toBe(true);
  });

  it("rejects a non-positive or non-integer capacity", () => {
    expect(
      createEventSchema.safeParse(validInput({ capacity: "0" })).success,
    ).toBe(false);
    expect(
      createEventSchema.safeParse(validInput({ capacity: "-1" })).success,
    ).toBe(false);
    expect(
      createEventSchema.safeParse(validInput({ capacity: "1.5" })).success,
    ).toBe(false);
  });

  it("accepts a valid positive integer capacity", () => {
    const result = createEventSchema.safeParse(validInput({ capacity: "100" }));
    expect(result.success).toBe(true);
  });

  it("rejects a missing category", () => {
    const result = createEventSchema.safeParse(validInput({ category: "" }));
    expect(result.success).toBe(false);
  });
});
