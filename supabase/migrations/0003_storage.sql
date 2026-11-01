-- ============================================================================
--  0003 · STORAGE BUCKET
--  Public read (property imagery is public by nature), owner-only write.
--  Uploads are performed server-side with the service role.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, accepted_mime_types)
values (
  'property-media',
  'property-media',
  true,
  67108864, -- 64 MB (covers the video limit)
  array['image/jpeg','image/png','image/webp','image/avif','video/mp4','video/webm','video/quicktime']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      accepted_mime_types = excluded.accepted_mime_types;

drop policy if exists "Public read property media objects" on storage.objects;
create policy "Public read property media objects"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'property-media');

drop policy if exists "Owner uploads property media objects" on storage.objects;
create policy "Owner uploads property media objects"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'property-media' and public.is_owner());

drop policy if exists "Owner updates property media objects" on storage.objects;
create policy "Owner updates property media objects"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'property-media' and public.is_owner())
  with check (bucket_id = 'property-media' and public.is_owner());

drop policy if exists "Owner deletes property media objects" on storage.objects;
create policy "Owner deletes property media objects"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'property-media' and public.is_owner());
