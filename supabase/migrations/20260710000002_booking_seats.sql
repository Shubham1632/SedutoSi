alter table public.bookings
  add column seats text[] not null default '{}';

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
