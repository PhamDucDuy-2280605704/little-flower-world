-- Allow the confirmed admin account to delete the image uploaded under
-- the earlier test-account folder. The test account itself has no write rights.
drop policy if exists garden_photos_delete_admin on storage.objects;
create policy garden_photos_delete_admin
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'garden-photos'
  and (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid
  and (storage.foldername(name))[1] in (
    '931bf7f4-4e68-4689-8607-cd5a28507011',
    'be6c9d98-2b4e-46a9-a6a0-30b4bbadc6b0'
  )
);
