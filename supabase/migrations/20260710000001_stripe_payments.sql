alter table public.bookings
  add column stripe_checkout_session_id text unique,
  add column stripe_payment_intent_id text;

create index on public.bookings (stripe_payment_intent_id);

drop policy "bookings: users manage own" on public.bookings;

create policy "bookings: users select own"
  on public.bookings for select to authenticated
  using (user_id = (select auth.uid()));
