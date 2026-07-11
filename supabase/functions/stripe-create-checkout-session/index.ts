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
    const redirectTo = String(body.redirectTo ?? "");
    if (!redirectTo) return json({ error: "Missing redirectTo" }, 400);

    const eventId = body.eventId ? String(body.eventId) : null;

    if (eventId) {
      return await createEventCheckout({
        stripe,
        supabase,
        user,
        eventId,
        quantity: Number(body.quantity ?? 0),
        redirectTo,
      });
    }

    const screeningId = String(body.screeningId ?? "");
    const seats = Array.isArray(body.seats)
      ? [...new Set(body.seats.map((s: unknown) => String(s)))]
      : [];

    if (!screeningId || seats.length < 1) {
      return json({ error: "Invalid screening or seats" }, 400);
    }

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

async function createEventCheckout({
  stripe,
  supabase,
  user,
  eventId,
  quantity,
  redirectTo,
}: {
  stripe: Stripe;
  // deno-lint-ignore no-explicit-any
  supabase: any;
  user: { id: string; email?: string };
  eventId: string;
  quantity: number;
  redirectTo: string;
}) {
  if (!eventId || !Number.isInteger(quantity) || quantity < 1) {
    return json({ error: "Invalid event or quantity" }, 400);
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, price, capacity")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    return json({ error: "Event not found" }, 404);
  }

  const price = event.price == null ? 0 : Number(event.price);
  if (price <= 0) {
    return json(
      { error: "This event is free — book it without Stripe" },
      400,
    );
  }

  if (event.capacity != null) {
    const { data: sold, error: soldError } = await supabase.rpc(
      "get_event_tickets_sold",
      { p_event_id: eventId },
    );
    if (soldError) throw soldError;
    const remaining = event.capacity - (sold ?? 0);
    if (quantity > remaining) {
      return json(
        {
          error:
            remaining > 0
              ? `Only ${remaining} ticket${remaining === 1 ? "" : "s"} left for this event`
              : "This event is sold out",
        },
        409,
      );
    }
  }

  const unitAmount = Math.round(price * 100);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: unitAmount,
          product_data: { name: event.title },
        },
        quantity,
      },
    ],
    success_url: `${redirectTo}?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${redirectTo}?status=cancel`,
    metadata: {
      user_id: user.id,
      event_id: eventId,
      quantity: String(quantity),
    },
  });

  if (!session.url) {
    return json({ error: "Stripe did not return a checkout URL" }, 502);
  }

  return json({ url: session.url });
}
