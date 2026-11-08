-- Qualify the outer Storage object name explicitly.
-- This prevents an unqualified name inside EXISTS from resolving to gardens.name.
drop policy if exists garden_photos_select_by_garden on storage.objects;
create policy garden_photos_select_by_garden
on storage.objects
for select
to authenticated
using (
  bucket_id = 'garden-photos'
  and (
    (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid
    or exists (
      select 1
      from public.gardens g
      where g.owner_id = (select auth.uid())
        and (
          g.id::text = (storage.foldername(storage.objects.name))[1]
          or g.owner_id::text = (storage.foldername(storage.objects.name))[1]
        )
    )
  )
);

drop policy if exists garden_photos_insert_admin on storage.objects;
create policy garden_photos_insert_admin
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'garden-photos'
  and (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid
  and exists (
    select 1
    from public.gardens g
    where g.id::text = (storage.foldername(storage.objects.name))[1]
  )
);
