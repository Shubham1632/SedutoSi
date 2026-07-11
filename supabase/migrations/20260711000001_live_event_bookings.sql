create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  category    text not null default 'other',
  location    text,
  image_url   text,
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  price       numeric(10,2),
  created_at  timestamptz not null default now()
);

alter table public.events add column if not exists capacity integer;
alter table public.events add column if not exists created_by uuid
  references public.profiles(id) on delete cascade;

create index if not exists events_starts_at_idx on public.events (starts_at);
create index if not exists events_created_by_idx on public.events (created_by);

alter table public.events enable row level security;

drop policy if exists "events: public read" on public.events;
create policy "events: public read"
  on public.events for select to anon, authenticated
  using (true);

drop policy if exists "events: users create own" on public.events;
create policy "events: users create own"
  on public.events for insert to authenticated
  with check (created_by = (select auth.uid()));

alter table public.bookings alter column screening_id drop not null;
alter table public.bookings add column if not exists event_id uuid
  references public.events(id) on delete cascade;
create index if not exists bookings_event_id_idx on public.bookings (event_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_screening_or_event_check'
  ) then
    alter table public.bookings add constraint bookings_screening_or_event_check
      check (
        (screening_id is not null and event_id is null)
        or (screening_id is null and event_id is not null)
      );
  end if;
end $$;

create or replace function public.get_event_tickets_sold(p_event_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(seats_count), 0)::integer
  from public.bookings
  where event_id = p_event_id
    and status = 'confirmed';
$$;

grant execute on function public.get_event_tickets_sold(uuid) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-images',
  'event-images',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "event images: public read" on storage.objects;
create policy "event images: public read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'event-images');

drop policy if exists "event images: users upload own" on storage.objects;
create policy "event images: users upload own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'event-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
