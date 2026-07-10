// Verifies a completed Stripe Checkout session and records the booking.
//
// Bookings are only ever written here, after Stripe confirms the session is
// `paid` and its metadata matches the caller — never inserted directly by the
// client (see the RLS policy change in 20260710000001_stripe_payments.sql).
// The insert uses the service-role key deliberately (the sanctioned use per
// CLAUDE.md's golden rule #2): RLS can't tell "verified by this function"
// apart from "inserted by the app", so the INSERT policy was removed and this
// is the one place allowed to bypass it.
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@^18.0.0";

import { corsHeaders, json } from "../_shared/cors.ts";

const BOOKING_SELECT =
  "*, screening:screenings(*, movie:movies(*), screen:screens(*, cinema:cinemas(*)))";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      // See the matching guard in stripe-create-checkout-session: this must
      // come before any Stripe client is constructed, or a missing key
      // crashes the function instead of returning a readable error.
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

    // Idempotent: a retried confirm (e.g. the client retrying after a dropped
    // response) returns the already-recorded booking instead of erroring.
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

    const screeningId = session.metadata?.screening_id;
    if (!screeningId) return json({ error: "Missing screening on session" }, 500);

    const seatsCount = Number(session.metadata?.seats_count ?? 1);
    const totalPrice = (session.amount_total ?? 0) / 100;
    const paymentIntentId =
      typeof session.payment_intent === "string" ? session.payment_intent : null;

    const { data: booking, error: insertError } = await supabaseAdmin
      .from("bookings")
      .insert({
        user_id: user.id,
        screening_id: screeningId,
        seats_count: seatsCount,
        total_price: totalPrice,
        status: "confirmed",
        stripe_checkout_session_id: sessionId,
        stripe_payment_intent_id: paymentIntentId,
      })
      .select(BOOKING_SELECT)
      .single();

    if (insertError) {
      // Unique violation on stripe_checkout_session_id: a concurrent request
      // already inserted it — return that row instead of failing.
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
