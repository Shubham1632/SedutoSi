-- Track which specific seats a booking covers (previously only a count), so
-- the seat map can show real "sold" seats instead of purely the cosmetic
-- filler in ~/lib/booking.ts.
alter table public.bookings
  add column seats text[] not null default '{}';

-- Exposes only the taken seat labels for a screening — no user_id, price, or
-- anything else — so the seat map can be read by any signed-in user browsing
-- a screening without widening the "select own" RLS policy on `bookings`.
-- security definer runs as the function owner, deliberately bypassing RLS on
-- the underlying table; the returned data is intentionally non-sensitive.
create or replace function public.get_booked_seats(p_screening_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(distinct seat), array[]::text[])
  from public.bookings, unnest(seats) as seat
  where screening_id = p_screening_id
    and status = 'confirmed';
$$;

grant execute on function public.get_booked_seats(uuid) to anon, authenticated;
