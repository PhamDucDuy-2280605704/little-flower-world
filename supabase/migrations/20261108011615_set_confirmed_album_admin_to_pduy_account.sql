-- Correct the shared photo album admin to the verified pduy14102004@gmail.com auth account.
-- Authenticated visitors may list/view; only the admin may upload or delete.
drop policy if exists garden_photos_insert_admin on storage.objects;
create policy garden_photos_insert_admin
on storage.objects for insert to authenticated
with check (
  bucket_id = 'garden-photos'
  and (storage.foldername(name))[1] = '931bf7f4-4e68-4689-8607-cd5a28507011'
  and (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid
);

drop policy if exists garden_photos_delete_admin on storage.objects;
create policy garden_photos_delete_admin
on storage.objects for delete to authenticated
using (
  bucket_id = 'garden-photos'
  and (storage.foldername(name))[1] = '931bf7f4-4e68-4689-8607-cd5a28507011'
  and (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid
);
