-- Shared read-only photo gallery. Authenticated visitors may view every image;
-- only the fairy-tale garden admin may upload or delete.
drop policy if exists garden_photos_select_own on storage.objects;
drop policy if exists garden_photos_select_all_authenticated on storage.objects;
create policy garden_photos_select_all_authenticated
on storage.objects for select to authenticated
using (bucket_id = 'garden-photos');

drop policy if exists garden_photos_insert_own on storage.objects;
drop policy if exists garden_photos_insert_admin on storage.objects;
create policy garden_photos_insert_admin
on storage.objects for insert to authenticated
with check (
  bucket_id = 'garden-photos'
  and (storage.foldername(name))[1] = 'be6c9d98-2b4e-46a9-a6a0-30b4bbadc6b0'
  and (select auth.uid()) = 'be6c9d98-2b4e-46a9-a6a0-30b4bbadc6b0'::uuid
);

drop policy if exists garden_photos_delete_own on storage.objects;
drop policy if exists garden_photos_delete_admin on storage.objects;
create policy garden_photos_delete_admin
on storage.objects for delete to authenticated
using (
  bucket_id = 'garden-photos'
  and (storage.foldername(name))[1] = 'be6c9d98-2b4e-46a9-a6a0-30b4bbadc6b0'
  and (select auth.uid()) = 'be6c9d98-2b4e-46a9-a6a0-30b4bbadc6b0'::uuid
);
