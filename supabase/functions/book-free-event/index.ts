// Books tickets for a FREE live event (price is null or 0) — Stripe Checkout
// can't charge €0, so this is the free-event equivalent of
// stripe-confirm-payment: it still does the server-side capacity check and
// the service-role insert, so a free booking is written the same verified
// way a paid one is (bookings are never inserted straight from the client —
// see the RLS policy change in 20260710000001_stripe_payments.sql / the
// comment at the top of stripe-confirm-payment).
import { createClient } from "jsr:@supabase/supabase-js@2";

import { corsHeaders, json } from "../_shared/cors.ts";

const BOOKING_SELECT =
  "*, screening:screenings(*, movie:movies(*), screen:screens(*, cinema:cinemas(*))), event:events(*)";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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
    const eventId = String(body.eventId ?? "");
    const quantity = Number(body.quantity ?? 0);
    if (!eventId || !Number.isInteger(quantity) || quantity < 1) {
      return json({ error: "Invalid event or quantity" }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id, price, capacity")
      .eq("id", eventId)
      .single();
    if (eventError || !event) {
      return json({ error: "Event not found" }, 404);
    }

    const price = event.price == null ? 0 : Number(event.price);
    if (price > 0) {
      return json({ error: "This event isn't free — pay with Stripe instead" }, 400);
    }

    if (event.capacity != null) {
      const { data: sold, error: soldError } = await supabaseAdmin.rpc(
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

    const { data: booking, error: insertError } = await supabaseAdmin
      .from("bookings")
      .insert({
        user_id: user.id,
        event_id: eventId,
        seats: [],
        seats_count: quantity,
        total_price: 0,
        status: "confirmed",
      })
      .select(BOOKING_SELECT)
      .single();
    if (insertError) throw insertError;

    return json({ booking });
  } catch (err) {
    console.error("[book-free-event]", err);
    return json({ error: "Could not book event" }, 500);
  }
});
