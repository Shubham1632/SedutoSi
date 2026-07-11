import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@^18.0.0";

import { corsHeaders, json } from "../_shared/cors.ts";

const BOOKING_SELECT =
  "*, screening:screenings(*, movie:movies(*), screen:screens(*, cinema:cinemas(*))), event:events(*)";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      console.error("[stripe-confirm-payment] STRIPE_SECRET_KEY is not set");
      return json({ error: "Stripe is not configured on the server" }, 500);
    }
    const stripe = new Stripe(stripeSecretKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();
    if (userError || !user) return json({ error: "Not authenticated" }, 401);

    const body = await req.json();
    const sessionId = String(body.sessionId ?? "");
    if (!sessionId) return json({ error: "Missing sessionId" }, 400);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: existing } = await supabaseAdmin
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("stripe_checkout_session_id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) return json({ booking: existing });

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return json({ error: "Payment was not completed" }, 402);
    }
    if (session.metadata?.user_id !== user.id) {
      return json({ error: "This payment does not belong to your account" }, 403);
    }

    const paymentIntentId =
      typeof session.payment_intent === "string" ? session.payment_intent : null;
    const totalPrice = (session.amount_total ?? 0) / 100;

    if (session.metadata?.event_id) {
      return await confirmEventBooking({
        stripe,
        supabaseAdmin,
        user,
        sessionId,
        eventId: session.metadata.event_id,
        quantity: Number(session.metadata.quantity ?? 0),
        totalPrice,
        paymentIntentId,
      });
    }

    const screeningId = session.metadata?.screening_id;
    const seats = (session.metadata?.seats ?? "").split(",").filter(Boolean);
    if (!screeningId || seats.length < 1) {
      return json({ error: "Missing screening or seats on session" }, 500);
    }

    const { data: bookedSeats, error: bookedSeatsError } = await supabaseAdmin.rpc(
      "get_booked_seats",
      { p_screening_id: screeningId },
    );
    if (bookedSeatsError) throw bookedSeatsError;
    const alreadyTaken = seats.filter((s) => (bookedSeats ?? []).includes(s));
    if (alreadyTaken.length > 0) {
      if (paymentIntentId) {
        await stripe.refunds.create({ payment_intent: paymentIntentId });
      }
      return json(
        {
          error: `Seat${alreadyTaken.length > 1 ? "s" : ""} ${alreadyTaken.join(", ")} ${alreadyTaken.length > 1 ? "were" : "was"} just booked by someone else. You have been refunded — please pick different seats.`,
        },
        409,
      );
    }

    const { data: booking, error: insertError } = await supabaseAdmin
      .from("bookings")
      .insert({
        user_id: user.id,
        screening_id: screeningId,
        seats,
        seats_count: seats.length,
        total_price: totalPrice,
        status: "confirmed",
        stripe_checkout_session_id: sessionId,
        stripe_payment_intent_id: paymentIntentId,
      })
      .select(BOOKING_SELECT)
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        const { data: fallback } = await supabaseAdmin
          .from("bookings")
          .select(BOOKING_SELECT)
          .eq("stripe_checkout_session_id", sessionId)
          .single();
        if (fallback) return json({ booking: fallback });
      }
      throw insertError;
    }

    return json({ booking });
  } catch (err) {
    console.error("[stripe-confirm-payment]", err);
    return json({ error: "Could not confirm payment" }, 500);
  }
});

async function confirmEventBooking({
  stripe,
  supabaseAdmin,
  user,
  sessionId,
  eventId,
  quantity,
  totalPrice,
  paymentIntentId,
}: {
  stripe: Stripe;
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any;
  user: { id: string };
  sessionId: string;
  eventId: string;
  quantity: number;
  totalPrice: number;
  paymentIntentId: string | null;
}) {
  if (!eventId || quantity < 1) {
    return json({ error: "Missing event or quantity on session" }, 500);
  }

  const { data: event, error: eventError } = await supabaseAdmin
    .from("events")
    .select("id, capacity")
    .eq("id", eventId)
    .single();
  if (eventError || !event) {
    return json({ error: "Event not found" }, 404);
  }

  if (event.capacity != null) {
    const { data: sold, error: soldError } = await supabaseAdmin.rpc(
      "get_event_tickets_sold",
      { p_event_id: eventId },
    );
    if (soldError) throw soldError;
    const remaining = event.capacity - (sold ?? 0);
    if (quantity > remaining) {
      if (paymentIntentId) {
        await stripe.refunds.create({ payment_intent: paymentIntentId });
      }
      return json(
        {
          error:
            "This event sold out just before your payment completed. You have been refunded.",
        },
        409,
      );
    }
  }

  const { data: booking, error: insertError } = await supabaseAdmin
    .from("bookings")
    .insert({
      user_id: user.id,
      event_id: eventId,
      seats: [],
      seats_count: quantity,
      total_price: totalPrice,
      status: "confirmed",
      stripe_checkout_session_id: sessionId,
      stripe_payment_intent_id: paymentIntentId,
    })
    .select(BOOKING_SELECT)
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: fallback } = await supabaseAdmin
        .from("bookings")
        .select(BOOKING_SELECT)
        .eq("stripe_checkout_session_id", sessionId)
        .single();
      if (fallback) return json({ booking: fallback });
    }
    throw insertError;
  }

  return json({ booking });
}
