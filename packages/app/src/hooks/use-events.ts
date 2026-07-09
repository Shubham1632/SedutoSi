"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useSupabase } from "@acme/api";

export interface LiveEvent {
  id: string;
  title: string;
  description: string | null;
  category: string;
  location: string | null;
  image_url: string | null;
  starts_at: string;
  ends_at: string | null;
  price: number | null;
}

export function useEvents() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at");
      if (error) throw error;
      return data as LiveEvent[];
    },
  });
}

export function useEvent(id: string) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["events", id],
    enabled: !!id,
    initialData: () =>
      queryClient
        .getQueryData<LiveEvent[]>(["events"])
        ?.find((event) => event.id === id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as LiveEvent;
    },
  });
}
