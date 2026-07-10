"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useSession, useSupabase } from "@acme/api";

import type { LiveEvent } from "./use-events";

export interface Movie {
  id: string;
  title: string;
  description: string | null;
  poster_url: string | null;
  genre: string | null;
  duration_minutes: number;
  language: string;
  rating: string | null;
  release_date: string | null;
}

export interface Cinema {
  id: string;
  name: string;
  address: string;
  neighborhood: string | null;
}

export interface Screen {
  id: string;
  cinema_id: string;
  name: string;
  total_seats: number;
  cinema?: Cinema;
}

export interface Screening {
  id: string;
  movie_id: string;
  screen_id: string;
  starts_at: string;
  ends_at: string;
  price: number;
  available_seats: number;
  movie?: Movie;
  screen?: Screen;
}

export interface Booking {
  id: string;
  user_id: string;
  screening_id: string | null;
  event_id: string | null;
  /** Seat labels for a movie booking; always empty for a general-admission event booking. */
  seats: string[];
  /** Seat count for movies, ticket quantity for events. */
  seats_count: number;
  total_price: number;
  status: "confirmed" | "cancelled";
  created_at: string;
  stripe_checkout_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  screening?: Screening;
  event?: LiveEvent;
}

const BOOKING_SELECT =
  "*, screening:screenings(*, movie:movies(*), screen:screens(*, cinema:cinemas(*))), event:events(*)";

export function useMovies() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["movies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movies")
        .select("*")
        .order("title");
      if (error) throw error;
      return data as Movie[];
    },
  });
}

export function useMovie(id: string) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["movies", id],
    enabled: !!id,
    // Render instantly from the already-fetched list (still revalidates in
    // the background) instead of blocking on a fresh round-trip.
    initialData: () =>
      queryClient
        .getQueryData<Movie[]>(["movies"])
        ?.find((movie) => movie.id === id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movies")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Movie;
    },
  });
}

export function useCinemas() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["cinemas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cinemas")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Cinema[];
    },
  });
}

export function useCinema(id: string) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["cinemas", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cinemas")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Cinema;
    },
  });
}

export function useCinemaMovies(cinemaId: string) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["cinemas", cinemaId, "movies"],
    enabled: !!cinemaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("screenings")
        .select(
          "*, movie:movies(*), screen:screens!inner(*, cinema:cinemas!inner(*))",
        )
        .eq("screen.cinema_id", cinemaId)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at");
      if (error) throw error;

      const screenings = data as Screening[];
      const grouped = new Map<
        string,
        { movie: Movie; showtimes: Screening[] }
      >();

      screenings.forEach((screening) => {
        const movie = screening.movie;
        if (!movie) return;

        const existing = grouped.get(movie.id);
        if (existing) {
          existing.showtimes.push(screening);
        } else {
          grouped.set(movie.id, { movie, showtimes: [screening] });
        }
      });

      return Array.from(grouped.values()).map((entry) => ({
        movie: entry.movie,
        showtimes: entry.showtimes.sort((a, b) =>
          a.starts_at.localeCompare(b.starts_at),
        ),
      }));
    },
  });
}

export function useScreeningsByCinemaAndMovie(
  cinemaId: string,
  movieId: string,
  date?: string,
) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: [
      "cinemas",
      cinemaId,
      "movies",
      movieId,
      "showtimes",
      date ?? "upcoming",
    ],
    enabled: !!cinemaId && !!movieId,
    queryFn: async () => {
      let query = supabase
        .from("screenings")
        .select("*, movie:movies(*), screen:screens(*, cinema:cinemas(*))")
        .eq("movie_id", movieId)
        .eq("screen.cinema_id", cinemaId)
        .order("starts_at");

      if (date) {
        // filter for the exact date (UTC day)
        const start = new Date(`${date}T00:00:00Z`).toISOString();
        const end = new Date(
          new Date(start).getTime() + 24 * 60 * 60 * 1000,
        ).toISOString();
        query = query.gte("starts_at", start).lt("starts_at", end);
      } else {
        query = query.gte("starts_at", new Date().toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Screening[];
    },
  });
}

export function useScreenings(movieId: string) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["screenings", movieId],
    enabled: !!movieId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("screenings")
        .select("*, screen:screens(*, cinema:cinemas(*))")
        .eq("movie_id", movieId)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at");
      if (error) throw error;
      return data as Screening[];
    },
  });
}

export function useScreening(id: string) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["screenings", "detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("screenings")
        .select("*, movie:movies(*), screen:screens(*, cinema:cinemas(*))")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Screening;
    },
  });
}

/**
 * Seats already sold for a screening, across every user — backed by the
 * `get_booked_seats` security-definer function so this works without
 * widening bookings' "select own" RLS policy. Polls while mounted (i.e.
 * while the seat map is open) so a seat someone else just bought shows as
 * taken without a manual refresh.
 */
export function useBookedSeats(screeningId: string) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["screenings", screeningId, "booked-seats"],
    enabled: !!screeningId,
    refetchInterval: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_booked_seats", {
        p_screening_id: screeningId,
      });
      if (error) throw error;
      return new Set(data);
    },
  });
}

export function useMyBookings() {
  const supabase = useSupabase();
  const { user } = useSession();
  return useQuery({
    queryKey: ["bookings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("bookings")
        .select(BOOKING_SELECT)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Booking[];
    },
  });
}

/**
 * A single booking (with its screening joined in), e.g. for the payment
 * success screen. Bookings are only ever created by the `stripe-confirm-payment`
 * edge function after a verified Stripe payment — see `use-stripe-checkout.ts`.
 */
export function useBooking(id: string) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["bookings", "detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(BOOKING_SELECT)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Booking;
    },
  });
}
