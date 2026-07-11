// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createFakeSupabase } from "../test-utils/fake-supabase";
import {
  createTestQueryClient,
  withSupabaseProvider,
} from "../test-utils/render";
import {
  useBookFreeEvent,
  useConfirmStripePayment,
  useCreateStripeCheckoutSession,
} from "./use-stripe-checkout";

function edgeFunctionError(body: unknown) {
  return Object.assign(new Error("non-2xx status code"), {
    context: new Response(JSON.stringify(body)),
  });
}

describe("useCreateStripeCheckoutSession", () => {
  it("returns the hosted checkout URL and forwards the params as the body", async () => {
    const invoke = vi.fn(() => ({ data: { url: "https://checkout/1" } }));
    const { client } = createFakeSupabase({
      functions: { "stripe-create-checkout-session": invoke },
    });

    const { result } = renderHook(() => useCreateStripeCheckoutSession(), {
      wrapper: withSupabaseProvider(client),
    });

    result.current.mutate({
      screeningId: "s1",
      seats: ["A1", "A2"],
      redirectTo: "exp://x",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe("https://checkout/1");
    expect(invoke).toHaveBeenCalledWith({
      body: { screeningId: "s1", seats: ["A1", "A2"], redirectTo: "exp://x" },
    });
  });

  it("surfaces the unwrapped edge-function error message", async () => {
    const { client } = createFakeSupabase({
      functions: {
        "stripe-create-checkout-session": () => ({
          error: edgeFunctionError({ error: "Not enough seats available" }),
        }),
      },
    });

    const { result } = renderHook(() => useCreateStripeCheckoutSession(), {
      wrapper: withSupabaseProvider(client),
    });

    result.current.mutate({
      screeningId: "s1",
      seats: ["A1"],
      redirectTo: "exp://x",
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Not enough seats available");
  });

  it("falls back to the raw error message when the response body isn't JSON", async () => {
    const notJson = Object.assign(new Error("non-2xx status code"), {
      context: new Response("plain text"),
    });
    const { client } = createFakeSupabase({
      functions: {
        "stripe-create-checkout-session": () => ({ error: notJson }),
      },
    });

    const { result } = renderHook(() => useCreateStripeCheckoutSession(), {
      wrapper: withSupabaseProvider(client),
    });

    result.current.mutate({
      screeningId: "s1",
      seats: ["A1"],
      redirectTo: "exp://x",
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("non-2xx status code");
  });

  it("falls back to a generic message for a non-Error, non-Response error", async () => {
    const { client } = createFakeSupabase({
      functions: {
        "stripe-create-checkout-session": () => ({ error: "network down" }),
      },
    });

    const { result } = renderHook(() => useCreateStripeCheckoutSession(), {
      wrapper: withSupabaseProvider(client),
    });

    result.current.mutate({
      screeningId: "s1",
      seats: ["A1"],
      redirectTo: "exp://x",
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Could not start checkout.");
  });

  it("throws a generic message when no data.url comes back", async () => {
    const { client } = createFakeSupabase({
      functions: { "stripe-create-checkout-session": () => ({ data: {} }) },
    });

    const { result } = renderHook(() => useCreateStripeCheckoutSession(), {
      wrapper: withSupabaseProvider(client),
    });

    result.current.mutate({
      screeningId: "s1",
      seats: ["A1"],
      redirectTo: "exp://x",
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Could not start checkout.");
  });
});

describe("useConfirmStripePayment", () => {
  it("returns the booking and invalidates bookings + the screening's seat map", async () => {
    const booking = {
      id: "b1",
      screening_id: "s1",
      event_id: null,
    };
    const { client } = createFakeSupabase({
      functions: {
        "stripe-confirm-payment": () => ({ data: { booking } }),
      },
    });
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useConfirmStripePayment(), {
      wrapper: withSupabaseProvider(client, queryClient),
    });

    result.current.mutate({ sessionId: "sess_1" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(booking);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["bookings"] });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["screenings", "s1", "booked-seats"],
    });
  });

  it("invalidates the event's ticket count for an event booking", async () => {
    const booking = { id: "b2", screening_id: null, event_id: "e1" };
    const { client } = createFakeSupabase({
      functions: { "stripe-confirm-payment": () => ({ data: { booking } }) },
    });
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useConfirmStripePayment(), {
      wrapper: withSupabaseProvider(client, queryClient),
    });

    result.current.mutate({ sessionId: "sess_2" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["events", "e1", "tickets-sold"],
    });
  });

  it("throws when the payment could not be confirmed", async () => {
    const { client } = createFakeSupabase({
      functions: { "stripe-confirm-payment": () => ({ data: {} }) },
    });

    const { result } = renderHook(() => useConfirmStripePayment(), {
      wrapper: withSupabaseProvider(client),
    });

    result.current.mutate({ sessionId: "sess_3" });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe(
      "Payment could not be confirmed.",
    );
  });
});

describe("useBookFreeEvent", () => {
  it("books free tickets and invalidates bookings + the event's ticket count", async () => {
    const booking = { id: "b3", event_id: "e1" };
    const invoke = vi.fn(() => ({ data: { booking } }));
    const { client } = createFakeSupabase({
      functions: { "book-free-event": invoke },
    });
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useBookFreeEvent(), {
      wrapper: withSupabaseProvider(client, queryClient),
    });

    result.current.mutate({ eventId: "e1", quantity: 2 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invoke).toHaveBeenCalledWith({
      body: { eventId: "e1", quantity: 2 },
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["bookings"] });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["events", "e1", "tickets-sold"],
    });
  });

  it("surfaces the unwrapped edge-function error message", async () => {
    const { client } = createFakeSupabase({
      functions: {
        "book-free-event": () => ({
          error: edgeFunctionError({ error: "Event is sold out" }),
        }),
      },
    });

    const { result } = renderHook(() => useBookFreeEvent(), {
      wrapper: withSupabaseProvider(client),
    });

    result.current.mutate({ eventId: "e1", quantity: 1 });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Event is sold out");
  });
});
