"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useSession, useSupabase } from "@acme/api";

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
  capacity: number | null;
  created_by: string | null;
}

export interface CreateEventInput {
  title: string;
  description?: string | null;
  category: string;
  location?: string | null;
  imageUrl: string;
  startsAt: string;
  endsAt?: string | null;
  price?: number | null;
  capacity?: number | null;
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

/**
 * Creates a live event directly (no moderation step) with the signed-in user
 * as organizer. The RLS insert policy ("events: users create own") requires
 * created_by to match auth.uid(), so a spoofed created_by is rejected server-side
 * even though it's also set here.
 */
export function useCreateEvent() {
  const supabase = useSupabase();
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEventInput) => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("events")
        .insert({
          title: input.title,
          description: input.description ?? null,
          category: input.category,
          location: input.location ?? null,
          image_url: input.imageUrl,
          starts_at: input.startsAt,
          ends_at: input.endsAt ?? null,
          price: input.price ?? null,
          capacity: input.capacity ?? null,
          created_by: user.id,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as LiveEvent;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

/**
 * Tickets already sold for an event, across every user — backed by the
 * `get_event_tickets_sold` security-definer function (mirrors
 * `useBookedSeats` for screenings) so this works without widening bookings'
 * "select own" RLS policy. Polls while mounted so capacity updates live
 * during the booking flow.
 */
export function useEventTicketsSold(eventId: string) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ["events", eventId, "tickets-sold"],
    enabled: !!eventId,
    refetchInterval: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_event_tickets_sold", {
        p_event_id: eventId,
      });
      if (error) throw error;
      return data;
    },
  });
}
