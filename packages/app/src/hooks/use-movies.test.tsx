// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createFakeSupabase } from "../test-utils/fake-supabase";
import {
  createTestQueryClient,
  withSupabaseProvider,
} from "../test-utils/render";
import {
  useCinemaMovies,
  useMovie,
  useScreeningsByCinemaAndMovie,
} from "./use-movies";

const movieA = { id: "movie-a", title: "Dune" };
const movieB = { id: "movie-b", title: "Arrival" };

function screening(id: string, movieId: string, startsAt: string) {
  return {
    id,
    movie_id: movieId,
    screen_id: "screen-1",
    starts_at: startsAt,
    ends_at: startsAt,
    price: 10,
    available_seats: 100,
    movie: movieId === movieA.id ? movieA : movieB,
    screen: { id: "screen-1", cinema_id: "cinema-1", name: "Screen 1" },
  };
}

describe("useCinemaMovies", () => {
  it("groups screenings by movie and sorts each movie's showtimes ascending", async () => {
    const raw = [
      screening("s1", movieA.id, "2026-06-01T20:00:00.000Z"),
      screening("s2", movieB.id, "2026-06-01T19:00:00.000Z"),
      screening("s3", movieA.id, "2026-06-01T18:00:00.000Z"),
    ];
    const { client } = createFakeSupabase({
      tables: {
        screenings: () => ({ data: raw, error: null }),
      },
    });

    const { result } = renderHook(() => useCinemaMovies("cinema-1"), {
      wrapper: withSupabaseProvider(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const grouped = result.current.data ?? [];
    expect(grouped).toHaveLength(2);

    const dune = grouped.find((g) => g.movie.id === movieA.id);
    expect(dune?.showtimes.map((s) => s.id)).toEqual(["s3", "s1"]); // 18:00 before 20:00

    const arrival = grouped.find((g) => g.movie.id === movieB.id);
    expect(arrival?.showtimes.map((s) => s.id)).toEqual(["s2"]);
  });

  it("queries the right table, filtered by cinema and future start times", async () => {
    const { client, calls } = createFakeSupabase({
      tables: {
        screenings: (query) => {
          expect(query.filters.some((f) => f.method === "eq")).toBe(true);
          expect(query.filters.find((f) => f.method === "eq")?.args).toEqual([
            "screen.cinema_id",
            "cinema-1",
          ]);
          expect(query.filters.some((f) => f.method === "gte")).toBe(true);
          return { data: [], error: null };
        },
      },
    });

    const { result } = renderHook(() => useCinemaMovies("cinema-1"), {
      wrapper: withSupabaseProvider(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(calls).toEqual([{ table: "screenings" }]);
  });

  it("does not query when cinemaId is empty (enabled: false)", () => {
    const { client, calls } = createFakeSupabase({
      tables: { screenings: () => ({ data: [], error: null }) },
    });

    const { result } = renderHook(() => useCinemaMovies(""), {
      wrapper: withSupabaseProvider(client),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(calls).toHaveLength(0);
  });
});

describe("useScreeningsByCinemaAndMovie", () => {
  it("filters to the exact UTC day when a date is given", async () => {
    const { client } = createFakeSupabase({
      tables: {
        screenings: (query) => {
          const gte = query.filters.find((f) => f.method === "gte");
          const lt = query.filters.find((f) => f.method === "lt");
          expect(gte?.args).toEqual(["starts_at", "2026-06-01T00:00:00.000Z"]);
          expect(lt?.args).toEqual(["starts_at", "2026-06-02T00:00:00.000Z"]);
          return { data: [], error: null };
        },
      },
    });

    const { result } = renderHook(
      () => useScreeningsByCinemaAndMovie("cinema-1", movieA.id, "2026-06-01"),
      { wrapper: withSupabaseProvider(client) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("filters to upcoming screenings only (no lt) when no date is given", async () => {
    const { client } = createFakeSupabase({
      tables: {
        screenings: (query) => {
          expect(query.filters.some((f) => f.method === "gte")).toBe(true);
          expect(query.filters.some((f) => f.method === "lt")).toBe(false);
          return { data: [], error: null };
        },
      },
    });

    const { result } = renderHook(
      () => useScreeningsByCinemaAndMovie("cinema-1", movieA.id),
      { wrapper: withSupabaseProvider(client) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useMovie", () => {
  it("renders instantly from the movies list cache, then reconciles with the fetch", async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(["movies"], [movieA, movieB]);

    const { client } = createFakeSupabase({
      tables: {
        movies: () => ({ data: movieA, error: null }),
      },
    });

    const { result } = renderHook(() => useMovie(movieA.id), {
      wrapper: withSupabaseProvider(client, queryClient),
    });

    // initialData makes the cached movie available on the very first render,
    // with no network round-trip needed.
    expect(result.current.data).toEqual(movieA);

    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(result.current.data).toEqual(movieA);
  });

  it("falls back to a real fetch when nothing is cached", async () => {
    const { client } = createFakeSupabase({
      tables: {
        movies: (query) => {
          expect(query.single).toBe("single");
          expect(query.filters.find((f) => f.method === "eq")?.args).toEqual([
            "id",
            movieB.id,
          ]);
          return { data: movieB, error: null };
        },
      },
    });

    const { result } = renderHook(() => useMovie(movieB.id), {
      wrapper: withSupabaseProvider(client),
    });

    expect(result.current.data).toBeUndefined();
    await waitFor(() => expect(result.current.data).toEqual(movieB));
  });
});
