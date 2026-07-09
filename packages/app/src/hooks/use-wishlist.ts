"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useSession, useSupabase } from "@acme/api";

import type { Movie } from "./use-movies";

export interface Wishlist {
  id: string;
  user_id: string;
  movie_id: string;
  created_at: string;
  movie?: Movie;
}

export function useWishlist() {
  const supabase = useSupabase();
  const { user } = useSession();

  return useQuery({
    queryKey: ["wishlist", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("wishlist")
        .select("*, movie:movies(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Wishlist[];
    },
    enabled: !!user?.id,
  });
}

export function useToggleWishlist() {
  const supabase = useSupabase();
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      movieId,
      wishlisted,
    }: {
      movieId: string;
      wishlisted: boolean;
    }) => {
      if (!user?.id) throw new Error("Not signed in");

      if (wishlisted) {
        const { error } = await supabase
          .from("wishlist")
          .insert({ user_id: user.id, movie_id: movieId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("wishlist")
          .delete()
          .eq("user_id", user.id)
          .eq("movie_id", movieId);
        if (error) throw error;
      }
    },
    onMutate: async ({ movieId, wishlisted }) => {
      const queryKey = ["wishlist", user?.id];
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<Wishlist[]>(queryKey);

      if (user?.id) {
        queryClient.setQueryData<Wishlist[]>(queryKey, (old) => {
          if (!old) return old;
          if (wishlisted) {
            // Optimistically add a placeholder row
            const optimisticRow: Wishlist = {
              id: `optimistic-${movieId}`,
              user_id: user.id,
              movie_id: movieId,
              created_at: new Date().toISOString(),
            };
            return [optimisticRow, ...old];
          }
          return old.filter((w) => w.movie_id !== movieId);
        });
      }

      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["wishlist", user?.id], context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["wishlist", user?.id] });
    },
  });
}
