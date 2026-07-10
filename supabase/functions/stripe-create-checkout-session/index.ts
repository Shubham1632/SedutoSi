// Creates a Stripe Checkout session for a screening + a set of seats.
//
// The client never sees the Stripe secret key or sets the price — the total
// is computed here from `screenings.price`, so a tampered client can't pay
// less than the real total. It also can't buy a seat someone else already
// holds: the requested seats are checked against `get_booked_seats` (see
// 20260710000002_booking_seats.sql) before the session is created. That
// check is best-effort (two people can still race between here and payment
// completing) — the hard check is in stripe-confirm-payment, which refunds
// if the race is actually lost. Card, Apple Pay, Google Pay and Revolut Pay
// all show up automatically on Stripe's hosted Checkout page as long as
// they're enabled for the account in the Stripe Dashboard (Settings →
// Payment methods) — nothing else to configure here.
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@^18.0.0";

import { corsHeaders, json } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      // Constructing the Stripe client with no key throws — guard first so
      // that shows up as a clear JSON error instead of an opaque 5xx (locally,
      // this var lives in supabase/functions/.env, NOT the project root .env
      // — see supabase/functions/.env.example).
      console.error("[stripe-create-checkout-session] STRIPE_SECRET_KEY is not set");
      return json({ error: "Stripe is not configured on the server" }, 500);
    }
    const stripe = new Stripe(stripeSecretKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: "Not authenticated" }, 401);

    const body = await req.json();
    const screeningId = String(body.screeningId ?? "");
    const redirectTo = String(body.redirectTo ?? "");
    const seats = Array.isArray(body.seats)
      ? [...new Set(body.seats.map((s: unknown) => String(s)))]
      : [];

    if (!screeningId || seats.length < 1) {
      return json({ error: "Invalid screening or seats" }, 400);
    }
    if (!redirectTo) return json({ error: "Missing redirectTo" }, 400);

    const { data: screening, error: screeningError } = await supabase
      .from("screenings")
      .select("id, price, movie:movies(title)")
      .eq("id", screeningId)
      .single();

    if (screeningError || !screening) {
      return json({ error: "Screening not found" }, 404);
    }

    const { data: bookedSeats, error: bookedSeatsError } = await supabase.rpc(
      "get_booked_seats",
      { p_screening_id: screeningId },
    );
    if (bookedSeatsError) throw bookedSeatsError;
    const alreadyTaken = seats.filter((s) => (bookedSeats ?? []).includes(s));
    if (alreadyTaken.length > 0) {
      return json(
        { error: `Seat${alreadyTaken.length > 1 ? "s" : ""} ${alreadyTaken.join(", ")} ${alreadyTaken.length > 1 ? "are" : "is"} no longer available` },
        409,
      );
    }

    const unitAmount = Math.round(Number(screening.price) * 100);
    const movieTitle =
      (screening.movie as { title?: string } | null)?.title ?? "Movie ticket";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: unitAmount,
            product_data: { name: movieTitle },
          },
          quantity: seats.length,
        },
      ],
      success_url: `${redirectTo}?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${redirectTo}?status=cancel`,
      metadata: {
        user_id: user.id,
        screening_id: screeningId,
        seats: seats.join(","),
      },
    });

    if (!session.url) {
      return json({ error: "Stripe did not return a checkout URL" }, 502);
    }

    return json({ url: session.url });
  } catch (err) {
    console.error("[stripe-create-checkout-session]", err);
    return json({ error: "Could not start checkout" }, 500);
  }
});
