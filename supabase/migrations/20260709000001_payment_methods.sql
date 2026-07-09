
create table public.payment_methods (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  brand      text not null,
  last4      text not null,
  exp_month  integer not null,
  exp_year   integer not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.payment_methods (user_id);

alter table public.payment_methods enable row level security;

create policy "payment_methods: users manage own"
  on public.payment_methods for all to authenticated
  using  (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
