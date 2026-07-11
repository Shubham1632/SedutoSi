import { describe, expect, it } from "vitest";

import { useNavMenu } from "./use-nav-menu";

describe("useNavMenu", () => {
  it("returns an empty, non-loading menu for native", () => {
    expect(useNavMenu("native")).toEqual({
      data: [],
      isLoading: false,
      error: null,
    });
  });

  it("returns an empty, non-loading menu for web", () => {
    expect(useNavMenu("web")).toEqual({
      data: [],
      isLoading: false,
      error: null,
    });
  });

  it("defaults to native when no platform is given", () => {
    expect(useNavMenu()).toEqual({ data: [], isLoading: false, error: null });
  });
});
