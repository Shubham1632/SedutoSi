// Creates a Stripe Checkout session for a screening + seat count.
//
// The client never sees the Stripe secret key or sets the price — the total
// is computed here from `screenings.price`, so a tampered client can't pay
// less than the real total. Card, Apple Pay, Google Pay and Revolut Pay all
// show up automatically on Stripe's hosted Checkout page as long as they're
// enabled for the account in the Stripe Dashboard (Settings → Payment
// methods) — nothing else to configure here.
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
    const seatsCount = Number(body.seatsCount);
    const redirectTo = String(body.redirectTo ?? "");

    if (!screeningId || !Number.isInteger(seatsCount) || seatsCount < 1) {
      return json({ error: "Invalid screening or seat count" }, 400);
    }
    if (!redirectTo) return json({ error: "Missing redirectTo" }, 400);

    const { data: screening, error: screeningError } = await supabase
      .from("screenings")
      .select("id, price, available_seats, movie:movies(title)")
      .eq("id", screeningId)
      .single();

    if (screeningError || !screening) {
      return json({ error: "Screening not found" }, 404);
    }
    if (seatsCount > screening.available_seats) {
      return json({ error: "Not enough seats available" }, 400);
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
          quantity: seatsCount,
        },
      ],
      success_url: `${redirectTo}?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${redirectTo}?status=cancel`,
      metadata: {
        user_id: user.id,
        screening_id: screeningId,
        seats_count: String(seatsCount),
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
