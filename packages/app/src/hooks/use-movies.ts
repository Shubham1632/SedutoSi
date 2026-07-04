"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useSession, useSupabase } from "@acme/api";

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
  screening_id: string;
  seats_count: number;
  total_price: number;
  status: "confirmed" | "cancelled";
  created_at: string;
  screening?: Screening;
}

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
  return useQuery({
    queryKey: ["movies", id],
    enabled: !!id,
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
        .select(
          "*, screening:screenings(*, movie:movies(*), screen:screens(*, cinema:cinemas(*)))",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Booking[];
    },
  });
}

export function useCreateBooking() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const { user } = useSession();

  return useMutation({
    mutationFn: async ({
      screeningId,
      seatsCount,
      totalPrice,
    }: {
      screeningId: string;
      seatsCount: number;
      totalPrice: number;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("bookings")
        .insert({
          user_id: user.id,
          screening_id: screeningId,
          seats_count: seatsCount,
          total_price: totalPrice,
          status: "confirmed",
        })
        .select()
        .single();
      if (error) throw error;
      return data as Booking;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}
