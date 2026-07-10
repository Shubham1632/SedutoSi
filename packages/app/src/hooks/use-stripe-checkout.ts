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
 * Starts a Stripe Checkout session for a screening (price is computed
 * server-side from `screenings.price`) and returns the hosted checkout URL to
 * open in the system browser.
 */
export function useCreateStripeCheckoutSession() {
  const supabase = useSupabase();

  return useMutation({
    mutationFn: async ({
      screeningId,
      seats,
      redirectTo,
    }: {
      screeningId: string;
      seats: string[];
      redirectTo: string;
    }) => {
      const result = await supabase.functions.invoke<{ url?: string }>(
        "stripe-create-checkout-session",
        { body: { screeningId, seats, redirectTo } },
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
      void queryClient.invalidateQueries({
        queryKey: ["screenings", booking.screening_id, "booked-seats"],
      });
    },
  });
}
