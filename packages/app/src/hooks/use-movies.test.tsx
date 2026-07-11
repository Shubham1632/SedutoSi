// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createFakeSupabase } from "../test-utils/fake-supabase";
import {
  createTestQueryClient,
  withSupabaseProvider,
} from "../test-utils/render";
import {
  useBookedSeats,
  useBooking,
  useCinema,
  useCinemaMovies,
  useCinemas,
  useMovie,
  useMyBookings,
  useScreening,
  useScreenings,
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

const cinemaA = { id: "cinema-a", name: "Odeon", address: "Via Roma 1" };

describe("useCinemas", () => {
  it("fetches all cinemas ordered by name", async () => {
    const { client } = createFakeSupabase({
      tables: {
        cinemas: (query) => {
          expect(query.filters.find((f) => f.method === "order")?.args).toEqual(
            ["name"],
          );
          return { data: [cinemaA], error: null };
        },
      },
    });

    const { result } = renderHook(() => useCinemas(), {
      wrapper: withSupabaseProvider(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([cinemaA]);
  });
});

describe("useCinema", () => {
  it("fetches a single cinema by id", async () => {
    const { client } = createFakeSupabase({
      tables: {
        cinemas: (query) => {
          expect(query.single).toBe("single");
          expect(query.filters.find((f) => f.method === "eq")?.args).toEqual([
            "id",
            cinemaA.id,
          ]);
          return { data: cinemaA, error: null };
        },
      },
    });

    const { result } = renderHook(() => useCinema(cinemaA.id), {
      wrapper: withSupabaseProvider(client),
    });

    await waitFor(() => expect(result.current.data).toEqual(cinemaA));
  });

  it("does not query when id is empty", () => {
    const { client, calls } = createFakeSupabase({
      tables: { cinemas: () => ({ data: null, error: null }) },
    });
    const { result } = renderHook(() => useCinema(""), {
      wrapper: withSupabaseProvider(client),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(calls).toHaveLength(0);
  });
});

describe("useScreenings", () => {
  it("fetches upcoming screenings for a movie", async () => {
    const { client } = createFakeSupabase({
      tables: {
        screenings: (query) => {
          expect(query.filters.find((f) => f.method === "eq")?.args).toEqual([
            "movie_id",
            movieA.id,
          ]);
          expect(query.filters.some((f) => f.method === "gte")).toBe(true);
          return {
            data: [screening("s1", movieA.id, "2026-06-01T20:00:00.000Z")],
            error: null,
          };
        },
      },
    });

    const { result } = renderHook(() => useScreenings(movieA.id), {
      wrapper: withSupabaseProvider(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });

  it("does not query when movieId is empty", () => {
    const { client, calls } = createFakeSupabase({
      tables: { screenings: () => ({ data: [], error: null }) },
    });
    const { result } = renderHook(() => useScreenings(""), {
      wrapper: withSupabaseProvider(client),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(calls).toHaveLength(0);
  });
});

describe("useScreening", () => {
  it("fetches a single screening by id", async () => {
    const s = screening("s1", movieA.id, "2026-06-01T20:00:00.000Z");
    const { client } = createFakeSupabase({
      tables: {
        screenings: (query) => {
          expect(query.single).toBe("single");
          expect(query.filters.find((f) => f.method === "eq")?.args).toEqual([
            "id",
            "s1",
          ]);
          return { data: s, error: null };
        },
      },
    });

    const { result } = renderHook(() => useScreening("s1"), {
      wrapper: withSupabaseProvider(client),
    });

    await waitFor(() => expect(result.current.data).toEqual(s));
  });
});

describe("useBookedSeats", () => {
  it("reads booked seats via the security-definer rpc as a Set", async () => {
    const { client } = createFakeSupabase({
      rpc: {
        get_booked_seats: (name, args) => {
          expect(args).toEqual({ p_screening_id: "s1" });
          return { data: ["A1", "A2"], error: null };
        },
      },
    });

    const { result } = renderHook(() => useBookedSeats("s1"), {
      wrapper: withSupabaseProvider(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(new Set(["A1", "A2"]));
  });

  it("does not query when screeningId is empty", () => {
    const { client } = createFakeSupabase({ rpc: {} });
    const { result } = renderHook(() => useBookedSeats(""), {
      wrapper: withSupabaseProvider(client),
    });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

const USER_ID = "user-1";
const session = { user: { id: USER_ID } };

describe("useMyBookings", () => {
  it("fetches the signed-in user's bookings, newest first", async () => {
    const booking = {
      id: "b1",
      user_id: USER_ID,
      screening_id: "s1",
      event_id: null,
      seats: ["A1"],
      seats_count: 1,
      total_price: 12,
      status: "confirmed",
      created_at: "2026-01-01T00:00:00.000Z",
    };
    const { client } = createFakeSupabase({
      session,
      tables: {
        bookings: (query) => {
          expect(query.filters.find((f) => f.method === "eq")?.args).toEqual([
            "user_id",
            USER_ID,
          ]);
          return { data: [booking], error: null };
        },
      },
    });

    const { result } = renderHook(() => useMyBookings(), {
      wrapper: withSupabaseProvider(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([booking]);
  });

  it("does not query when signed out", () => {
    const { client, calls } = createFakeSupabase({ session: null, tables: {} });
    const { result } = renderHook(() => useMyBookings(), {
      wrapper: withSupabaseProvider(client),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(calls).toHaveLength(0);
  });
});

describe("useBooking", () => {
  it("fetches a single booking (with screening/event joined) by id", async () => {
    const booking = {
      id: "b1",
      user_id: USER_ID,
      screening_id: "s1",
      event_id: null,
      seats: ["A1"],
      seats_count: 1,
      total_price: 12,
      status: "confirmed",
      created_at: "2026-01-01T00:00:00.000Z",
    };
    const { client } = createFakeSupabase({
      tables: {
        bookings: (query) => {
          expect(query.single).toBe("single");
          expect(query.filters.find((f) => f.method === "eq")?.args).toEqual([
            "id",
            "b1",
          ]);
          return { data: booking, error: null };
        },
      },
    });

    const { result } = renderHook(() => useBooking("b1"), {
      wrapper: withSupabaseProvider(client),
    });

    await waitFor(() => expect(result.current.data).toEqual(booking));
  });
});
