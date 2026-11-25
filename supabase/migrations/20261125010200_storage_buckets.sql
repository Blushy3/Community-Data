-- ---------------------------------------------------------------------------
-- Storage: avatars and banners (README §7)
--
-- Objects are stored under `{user_id}/{filename}` so ownership can be checked
-- from the object path. Buckets are public for reading (profile images are
-- public), but writes are restricted to the owning user.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/webp', 'image/png', 'image/jpeg']),
  ('banners', 'banners', true, 5242880, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Read: public buckets, so anonymous visitors can load profile images.
create policy "profile images are publicly readable"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id in ('avatars', 'banners'));

-- Write: only inside the user's own folder.
create policy "members upload their own profile images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id in ('avatars', 'banners')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "members replace their own profile images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id in ('avatars', 'banners')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id in ('avatars', 'banners')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "members delete their own profile images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id in ('avatars', 'banners')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
