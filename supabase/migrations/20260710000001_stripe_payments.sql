-- Stripe Checkout support for bookings.
--
-- A booking now always corresponds to a real, verified Stripe payment: the
-- `stripe-confirm-payment` edge function checks the Checkout session with
-- Stripe (server-side, using the secret key) before writing a row, then
-- inserts it with the service-role key. So client-side inserts are no longer
-- allowed — only the user's own SELECT stays.

alter table public.bookings
  add column stripe_checkout_session_id text unique,
  add column stripe_payment_intent_id text;

create index on public.bookings (stripe_payment_intent_id);

drop policy "bookings: users manage own" on public.bookings;

create policy "bookings: users select own"
  on public.bookings for select to authenticated
  using (user_id = (select auth.uid()));
