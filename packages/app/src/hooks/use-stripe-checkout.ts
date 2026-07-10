"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useSupabase } from "@acme/api";

import type { Booking } from "./use-movies";

/**
 * Edge functions return `{ error: "..." }` on non-2xx responses, but
 * supabase-js's `FunctionsHttpError` only exposes that body via
 * `error.context` (a Response). Unwrap it so callers get the real reason
 * ("Not enough seats available", "Payment was not completed", …) instead of
 * a generic "non-2xx status code" message.
 */
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
    } catch {
      // response body wasn't JSON — fall through to the generic message
    }
  }
  return error instanceof Error ? error.message : fallback;
}

/**
 * Starts a Stripe Checkout session for either a screening (seats) or a paid
 * event (quantity) — exactly one of the two must be provided. Price is always
 * computed server-side (`screenings.price` / `events.price`), and the hosted
 * checkout URL is returned to open in the system browser.
 */
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

/**
 * Verifies a completed Stripe Checkout session server-side and records the
 * booking. Safe to call more than once for the same session (idempotent).
 */
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

/**
 * Books tickets for a free event (price is null/0) directly, skipping Stripe
 * — Checkout can't charge €0. The `book-free-event` edge function still does
 * the server-side capacity check and service-role insert, so a free booking
 * is written the same verified way a paid one is (see the edge function for
 * why bookings are never inserted straight from the client).
 */
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
