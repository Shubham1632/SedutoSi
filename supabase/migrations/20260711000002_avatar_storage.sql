-- Avatars: user-uploaded profile pictures, plus a fallback to the OAuth
-- provider's photo (Google) captured at signup.

-- `handle_new_user()` only read `avatar_url` from OAuth metadata; Supabase's
-- Google provider also (sometimes only) populates `picture`. Fall back to it.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ============================================================================
-- Storage: profile avatars, uploaded by the user themselves.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MiB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "avatars: public read" on storage.objects;
create policy "avatars: public read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'avatars');

-- Uploads must land under a folder named after the uploader's own user id
-- (checked by the client — see packages/app's avatar upload hook).
drop policy if exists "avatars: users upload own" on storage.objects;
create policy "avatars: users upload own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Avatars get replaced (not just added), so uploads use upsert — which needs
-- update as well as insert.
drop policy if exists "avatars: users update own" on storage.objects;
create policy "avatars: users update own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "avatars: users delete own" on storage.objects;
create policy "avatars: users delete own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
