-- Lock reviewed/published chapters from creator edits and enforce review rules.
create or replace function public.enforce_story_creator_permissions()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  admin_user_id constant uuid := '931bf7f4-4e68-4689-8607-cd5a28507011';
  content_changed boolean := false;
begin
  if (select auth.uid()) = admin_user_id then
    if new.approval_status = 'rejected' then
      new.is_published := false;
      new.share_slug := null;
      new.published_at := null;
    end if;
    if new.is_published and new.approval_status <> 'approved' then
      raise exception 'Story must be approved before publishing';
    end if;
    return new;
  end if;

  if (select auth.uid()) is null then
    raise exception 'Authentication is required to edit a story';
  end if;
  if tg_op = 'INSERT' then
    if new.owner_id is distinct from (select auth.uid()) then
      raise exception 'A creator can only create stories for their own account';
    end if;
    new.approval_status := 'draft';
    new.is_published := false;
    new.share_slug := null;
    new.published_at := null;
    new.guestbook_enabled := false;
    return new;
  end if;
  if new.owner_id is distinct from old.owner_id
     or old.owner_id is distinct from (select auth.uid()) then
    raise exception 'A creator cannot transfer or edit another account story';
  end if;
  if new.is_published is distinct from old.is_published
     or new.share_slug is distinct from old.share_slug
     or new.published_at is distinct from old.published_at
     or new.guestbook_enabled is distinct from old.guestbook_enabled then
    raise exception 'Publishing, share links, PIN and guestbook controls are Admin-only';
  end if;

  content_changed :=
       new.name is distinct from old.name
    or new.introduction is distinct from old.introduction
    or new.letter_title is distinct from old.letter_title
    or new.letter_paragraphs is distinct from old.letter_paragraphs
    or new.letter_signature is distinct from old.letter_signature
    or new.experience_settings is distinct from old.experience_settings
    or new.cover_path is distinct from old.cover_path;
  if old.approval_status = 'pending' and content_changed then
    raise exception 'A story awaiting review cannot be edited';
  end if;
  if old.approval_status = 'approved'
     and new.approval_status is distinct from old.approval_status
     and not content_changed then
    raise exception 'An approved story can only be changed after editing its content';
  end if;
  if new.approval_status in ('approved', 'rejected')
     and new.approval_status is distinct from old.approval_status then
    raise exception 'Only Admin can approve or reject a story';
  end if;
  if old.approval_status in ('approved', 'rejected') and content_changed then
    new.approval_status := 'draft';
    new.is_published := false;
    new.share_slug := null;
    new.published_at := null;
  end if;
  return new;
end;
$$;

drop policy if exists gardens_creator_delete on public.gardens;
create policy gardens_creator_delete
  on public.gardens for delete to authenticated
  using (
    (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid
    or (owner_id = (select auth.uid())
      and approval_status in ('draft', 'rejected')
      and is_published = false)
  );

drop policy if exists garden_chapters_creator_insert on public.garden_chapters;
create policy garden_chapters_creator_insert
  on public.garden_chapters for insert to authenticated
  with check (
    (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid
    or exists (select 1 from public.gardens g
      where g.id = garden_chapters.garden_id
        and g.owner_id = (select auth.uid())
        and g.approval_status in ('draft', 'rejected')
        and g.is_published = false)
  );

drop policy if exists garden_chapters_creator_update on public.garden_chapters;
create policy garden_chapters_creator_update
  on public.garden_chapters for update to authenticated
  using (
    (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid
    or exists (select 1 from public.gardens g
      where g.id = garden_chapters.garden_id
        and g.owner_id = (select auth.uid())
        and g.approval_status in ('draft', 'rejected')
        and g.is_published = false)
  )
  with check (
    (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid
    or exists (select 1 from public.gardens g
      where g.id = garden_chapters.garden_id
        and g.owner_id = (select auth.uid())
        and g.approval_status in ('draft', 'rejected')
        and g.is_published = false)
  );

drop policy if exists garden_chapters_creator_delete on public.garden_chapters;
create policy garden_chapters_creator_delete
  on public.garden_chapters for delete to authenticated
  using (
    (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid
    or exists (select 1 from public.gardens g
      where g.id = garden_chapters.garden_id
        and g.owner_id = (select auth.uid())
        and g.approval_status in ('draft', 'rejected')
        and g.is_published = false)
  );

drop policy if exists garden_items_creator_insert on public.garden_items;
create policy garden_items_creator_insert
  on public.garden_items for insert to authenticated
  with check (
    (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid
    or exists (select 1 from public.gardens g
      where g.id = garden_items.garden_id
        and g.owner_id = (select auth.uid())
        and g.approval_status in ('draft', 'rejected')
        and g.is_published = false)
  );

drop policy if exists garden_items_creator_update on public.garden_items;
create policy garden_items_creator_update
  on public.garden_items for update to authenticated
  using (
    (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid
    or exists (select 1 from public.gardens g
      where g.id = garden_items.garden_id
        and g.owner_id = (select auth.uid())
        and g.approval_status in ('draft', 'rejected')
        and g.is_published = false)
  )
  with check (
    (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid
    or exists (select 1 from public.gardens g
      where g.id = garden_items.garden_id
        and g.owner_id = (select auth.uid())
        and g.approval_status in ('draft', 'rejected')
        and g.is_published = false)
  );

drop policy if exists garden_items_creator_delete on public.garden_items;
create policy garden_items_creator_delete
  on public.garden_items for delete to authenticated
  using (
    (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid
    or exists (select 1 from public.gardens g
      where g.id = garden_items.garden_id
        and g.owner_id = (select auth.uid())
        and g.approval_status in ('draft', 'rejected')
        and g.is_published = false)
  );

create or replace function public.enforce_creator_story_photo_quota()
returns trigger
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
declare
  admin_user_id constant uuid := '931bf7f4-4e68-4689-8607-cd5a28507011';
  story_folder text;
  story_owner uuid;
  story_status text;
  story_is_published boolean;
  photo_count integer;
begin
  if new.bucket_id <> 'garden-photos' then return new; end if;
  if (select auth.uid()) = admin_user_id then return new; end if;

  story_folder := (storage.foldername(new.name))[1];
  select g.owner_id, g.approval_status, g.is_published
    into story_owner, story_status, story_is_published
  from public.gardens g where g.id::text = story_folder;

  if story_owner is null or story_owner <> (select auth.uid()) then
    raise exception 'A creator can only upload photos to their own story';
  end if;
  if story_status not in ('draft', 'rejected') or story_is_published then
    raise exception 'Photos cannot be added while a story is under review or published';
  end if;
  if coalesce(new.metadata->>'mimetype', '') not like 'image/%' then
    raise exception 'Only image files can be uploaded to a story';
  end if;

  select count(*) into photo_count
  from storage.objects o
  where o.bucket_id = 'garden-photos'
    and (storage.foldername(o.name))[1] = story_folder
    and coalesce(o.metadata->>'mimetype', '') like 'image/%';
  if photo_count >= 5 then
    raise exception 'Creator accounts can upload up to five photos per story';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_creator_story_photo_quota on storage.objects;
create trigger enforce_creator_story_photo_quota
before insert on storage.objects
for each row execute function public.enforce_creator_story_photo_quota();
