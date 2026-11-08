-- Give the verified Admin account read access to all gardens for the /admin dashboard.
-- Garden owners continue to see only their own garden data.
drop policy if exists gardens_select_owner_guard on public.gardens;
create policy gardens_select_owner_guard
on public.gardens as restrictive
for select to authenticated
using (
  owner_id = (select auth.uid())
  or (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid
);

drop policy if exists gardens_select_admin on public.gardens;
create policy gardens_select_admin
on public.gardens as permissive
for select to authenticated
using ((select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid);

drop policy if exists garden_chapters_select_owner_guard on public.garden_chapters;
create policy garden_chapters_select_owner_guard
on public.garden_chapters as restrictive
for select to authenticated
using (
  exists (
    select 1 from public.gardens g
    where g.id = garden_chapters.garden_id
      and (
        g.owner_id = (select auth.uid())
        or (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid
      )
  )
);

drop policy if exists garden_chapters_select_admin on public.garden_chapters;
create policy garden_chapters_select_admin
on public.garden_chapters as permissive
for select to authenticated
using (
  exists (
    select 1 from public.gardens g
    where g.id = garden_chapters.garden_id
      and (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid
  )
);

drop policy if exists garden_items_select_owner_guard on public.garden_items;
create policy garden_items_select_owner_guard
on public.garden_items as restrictive
for select to authenticated
using (
  exists (
    select 1 from public.gardens g
    where g.id = garden_items.garden_id
      and (
        g.owner_id = (select auth.uid())
        or (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid
      )
  )
);

drop policy if exists garden_items_select_admin on public.garden_items;
create policy garden_items_select_admin
on public.garden_items as permissive
for select to authenticated
using (
  exists (
    select 1 from public.gardens g
    where g.id = garden_items.garden_id
      and (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid
  )
);

-- Each album lives in garden-photos/<garden_id>/<file>.
-- Only that garden's owner and the admin may request signed viewing URLs.
drop policy if exists garden_photos_select_all_authenticated on storage.objects;
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
      select 1 from public.gardens g
      where g.owner_id = (select auth.uid())
        and (
          g.id::text = (storage.foldername(name))[1]
          or g.owner_id::text = (storage.foldername(name))[1]
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
    select 1 from public.gardens g
    where g.id::text = (storage.foldername(name))[1]
  )
);

drop policy if exists garden_photos_delete_admin on storage.objects;
create policy garden_photos_delete_admin
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'garden-photos'
  and (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid
);
