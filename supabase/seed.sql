-- Seed data for local dev. Runs after migrations on `supabase db reset`.
-- CinemaMilano — demo movies, cinemas and screenings for Milan, Italy.

-- ============================================================================
-- Cinemas in Milan
-- ============================================================================
insert into public.cinemas (id, name, address, neighborhood) values
  ('c1111111-1111-1111-1111-111111111101', 'Anteo Palazzo del Cinema',  'Via Milazzo 9, 20121 Milano',      'Porta Volta'),
  ('c1111111-1111-1111-1111-111111111102', 'Cinema Mexico',             'Via Savona 57, 20144 Milano',      'Navigli'),
  ('c1111111-1111-1111-1111-111111111103', 'Odeon Multisala',           'Via Santa Radegonda 8, 20121 Milano','Duomo'),
  ('c1111111-1111-1111-1111-111111111104', 'UCI Cinemas Bicocca',       'Viale Sarca 336, 20126 Milano',    'Bicocca')
on conflict (id) do nothing;

-- ============================================================================
-- Screens (one per cinema for simplicity)
-- ============================================================================
insert into public.screens (id, cinema_id, name, total_seats) values
  ('a2222222-2222-2222-2222-222222222201', 'c1111111-1111-1111-1111-111111111101', 'Sala Uno',   120),
  ('a2222222-2222-2222-2222-222222222202', 'c1111111-1111-1111-1111-111111111102', 'Sala Grande', 90),
  ('a2222222-2222-2222-2222-222222222203', 'c1111111-1111-1111-1111-111111111103', 'Screen 1',   200),
  ('a2222222-2222-2222-2222-222222222204', 'c1111111-1111-1111-1111-111111111104', 'Hall A',     150)
on conflict (id) do nothing;

-- ============================================================================
-- Movies
-- ============================================================================
insert into public.movies (id, title, description, genre, duration_minutes, language, rating, poster_url) values
  (
    'b3333333-3333-3333-3333-333333333301',
    'Il Padrino',
    'La storia epica della famiglia Corleone, uno dei clan mafiosi più potenti d''America. Un classico senza tempo.',
    'Drama',
    175,
    'Italian',
    'VM14',
    'https://upload.wikimedia.org/wikipedia/en/1/1c/Godfather_ver1.jpg'
  ),
  (
    'b3333333-3333-3333-3333-333333333302',
    'Inception',
    'Un ladro esperto di furti nei sogni riceve un''ultima missione: impiantare un''idea nella mente di un CEO.',
    'Sci-Fi',
    148,
    'English',
    'PG-13',
    'https://upload.wikimedia.org/wikipedia/en/2/2e/Inception_%282010%29_theatrical_poster.jpg'
  ),
  (
    'b3333333-3333-3333-3333-333333333303',
    'La La Land',
    'Una pianista e un jazzista inseguono i loro sogni nella Los Angeles moderna, tra amore e ambizione.',
    'Musical',
    128,
    'English',
    'PG',
    'https://upload.wikimedia.org/wikipedia/en/a/ab/La_La_Land_%28film%29.png'
  ),
  (
    'b3333333-3333-3333-3333-333333333304',
    'Interstellar',
    'Un gruppo di astronauti viaggia attraverso un wormhole alla ricerca di un nuovo pianeta abitabile per l''umanità.',
    'Sci-Fi',
    169,
    'English',
    'PG-13',
    'https://upload.wikimedia.org/wikipedia/en/b/bc/Interstellar_film_poster.jpg'
  )
on conflict (id) do nothing;

-- ============================================================================
-- Screenings (future dates relative to migration time — adjust year if needed)
-- ============================================================================
insert into public.screenings (movie_id, screen_id, starts_at, ends_at, price, available_seats) values
  -- Il Padrino
  ('b3333333-3333-3333-3333-333333333301', 'a2222222-2222-2222-2222-222222222201',
   now() + interval '1 day 18:00:00', now() + interval '1 day 20:55:00', 9.50, 80),
  ('b3333333-3333-3333-3333-333333333301', 'a2222222-2222-2222-2222-222222222203',
   now() + interval '2 days 20:30:00', now() + interval '2 days 23:25:00', 11.00, 140),

  -- Inception
  ('b3333333-3333-3333-3333-333333333302', 'a2222222-2222-2222-2222-222222222202',
   now() + interval '1 day 15:00:00', now() + interval '1 day 17:28:00', 8.50, 60),
  ('b3333333-3333-3333-3333-333333333302', 'a2222222-2222-2222-2222-222222222204',
   now() + interval '3 days 21:00:00', now() + interval '3 days 23:28:00', 10.00, 120),

  -- La La Land
  ('b3333333-3333-3333-3333-333333333303', 'a2222222-2222-2222-2222-222222222201',
   now() + interval '2 days 17:30:00', now() + interval '2 days 19:38:00', 9.00, 90),
  ('b3333333-3333-3333-3333-333333333303', 'a2222222-2222-2222-2222-222222222203',
   now() + interval '4 days 19:00:00', now() + interval '4 days 21:08:00', 10.50, 180),

  -- Interstellar
  ('b3333333-3333-3333-3333-333333333304', 'a2222222-2222-2222-2222-222222222202',
   now() + interval '1 day 20:00:00', now() + interval '1 day 22:49:00', 9.00, 70),
  ('b3333333-3333-3333-3333-333333333304', 'a2222222-2222-2222-2222-222222222204',
   now() + interval '5 days 16:00:00', now() + interval '5 days 18:49:00', 11.00, 130);
