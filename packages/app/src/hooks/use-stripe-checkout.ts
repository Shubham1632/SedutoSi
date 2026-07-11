"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useSupabase } from "@acme/api";

import type { Booking } from "./use-movies";

async function extractErrorMessage(
  error: unknown,
  fallback: string,
): Promise<string> {
  if (
    error &&
    typeof error === "object" &&
    "context" in error &&
    (error as { context?: unknown }).context instanceof Response
  ) {
    try {
      const response = (error as { context: Response }).context;
      const body = (await response.clone().json()) as { error?: string };
      if (body.error) return body.error;
      // eslint-disable-next-line no-empty
    } catch {}
  }
  return error instanceof Error ? error.message : fallback;
}

export function useCreateStripeCheckoutSession() {
  const supabase = useSupabase();

  return useMutation({
    mutationFn: async (
      params:
        | { screeningId: string; seats: string[]; redirectTo: string }
        | { eventId: string; quantity: number; redirectTo: string },
    ) => {
      const result = await supabase.functions.invoke<{ url?: string }>(
        "stripe-create-checkout-session",
        { body: params },
      );
      if (result.error) {
        throw new Error(
          await extractErrorMessage(result.error, "Could not start checkout."),
        );
      }
      if (!result.data?.url) throw new Error("Could not start checkout.");
      return result.data.url;
    },
  });
}

export function useConfirmStripePayment() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId }: { sessionId: string }) => {
      const result = await supabase.functions.invoke<{
        booking?: Booking;
      }>("stripe-confirm-payment", { body: { sessionId } });
      if (result.error) {
        throw new Error(
          await extractErrorMessage(
            result.error,
            "Payment could not be confirmed.",
          ),
        );
      }
      if (!result.data?.booking) {
        throw new Error("Payment could not be confirmed.");
      }
      return result.data.booking;
    },
    onSuccess: (booking) => {
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
      if (booking.screening_id) {
        void queryClient.invalidateQueries({
          queryKey: ["screenings", booking.screening_id, "booked-seats"],
        });
      }
      if (booking.event_id) {
        void queryClient.invalidateQueries({
          queryKey: ["events", booking.event_id, "tickets-sold"],
        });
      }
    },
  });
}

export function useBookFreeEvent() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      quantity,
    }: {
      eventId: string;
      quantity: number;
    }) => {
      const result = await supabase.functions.invoke<{ booking?: Booking }>(
        "book-free-event",
        { body: { eventId, quantity } },
      );
      if (result.error) {
        throw new Error(
          await extractErrorMessage(result.error, "Could not book event."),
        );
      }
      if (!result.data?.booking) throw new Error("Could not book event.");
      return result.data.booking;
    },
    onSuccess: (booking) => {
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
      if (booking.event_id) {
        void queryClient.invalidateQueries({
          queryKey: ["events", booking.event_id, "tickets-sold"],
        });
      }
    },
  });
}
