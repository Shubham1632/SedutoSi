
create table public.movies (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  poster_url      text,
  genre           text,
  duration_minutes integer not null default 90,
  language        text not null default 'Italian',
  rating          text,          -- e.g. 'PG-13', 'VM18'
  release_date    date,
  created_at      timestamptz not null default now()
);

alter table public.movies enable row level security;

create policy "movies: public read"
  on public.movies for select to anon, authenticated
  using (true);

-- ============================================================================
-- Cinemas (Milan locations)
-- ============================================================================
create table public.cinemas (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  address      text not null,
  neighborhood text,
  created_at   timestamptz not null default now()
);

alter table public.cinemas enable row level security;

create policy "cinemas: public read"
  on public.cinemas for select to anon, authenticated
  using (true);


create table public.screens (
  id          uuid primary key default gen_random_uuid(),
  cinema_id   uuid not null references public.cinemas(id) on delete cascade,
  name        text not null,
  total_seats integer not null default 100,
  created_at  timestamptz not null default now()
);
create index on public.screens (cinema_id);

alter table public.screens enable row level security;

create policy "screens: public read"
  on public.screens for select to anon, authenticated
  using (true);


create table public.screenings (
  id              uuid primary key default gen_random_uuid(),
  movie_id        uuid not null references public.movies(id) on delete cascade,
  screen_id       uuid not null references public.screens(id) on delete cascade,
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  price           numeric(10,2) not null,
  available_seats integer not null,
  created_at      timestamptz not null default now()
);
create index on public.screenings (movie_id);
create index on public.screenings (screen_id);
create index on public.screenings (starts_at);

alter table public.screenings enable row level security;

create policy "screenings: public read"
  on public.screenings for select to anon, authenticated
  using (true);


create table public.bookings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  screening_id uuid not null references public.screenings(id) on delete cascade,
  seats_count  integer not null default 1,
  total_price  numeric(10,2) not null,
  status       text not null default 'confirmed'
               check (status in ('confirmed', 'cancelled')),
  created_at   timestamptz not null default now()
);
create index on public.bookings (user_id);
create index on public.bookings (screening_id);

alter table public.bookings enable row level security;

create policy "bookings: users manage own"
  on public.bookings for all to authenticated
  using  (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
