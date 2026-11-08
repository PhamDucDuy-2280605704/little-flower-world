-- Guest story authoring with Admin-only publishing and moderation.
alter table public.gardens
  add column if not exists approval_status text not null default 'draft';

alter table public.gardens drop constraint if exists gardens_approval_status_check;
alter table public.gardens
  add constraint gardens_approval_status_check
  check (approval_status in ('draft', 'pending', 'approved', 'rejected'));

update public.gardens
set approval_status = case when is_published then 'approved' else 'draft' end
where approval_status = 'draft' and is_published = true;

create index if not exists gardens_approval_status_created_idx
  on public.gardens(approval_status, created_at desc);

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

  if new.approval_status not in ('draft', 'pending') then
    raise exception 'Only Admin can approve or reject a story';
  end if;

  if new.cover_path is not null
     and left(new.cover_path, char_length(new.id::text) + 1) <> new.id::text || '/' then
    raise exception 'A story cover must belong to its own photo folder';
  end if;

  content_changed :=
       new.name is distinct from old.name
    or new.introduction is distinct from old.introduction
    or new.letter_title is distinct from old.letter_title
    or new.letter_paragraphs is distinct from old.letter_paragraphs
    or new.letter_signature is distinct from old.letter_signature
    or new.experience_settings is distinct from old.experience_settings
    or new.cover_path is distinct from old.cover_path;

  if old.approval_status = 'approved' and content_changed then
    new.approval_status := 'draft';
    new.is_published := false;
    new.share_slug := null;
    new.published_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_story_creator_permissions on public.gardens;
create trigger enforce_story_creator_permissions
before insert or update on public.gardens
for each row execute function public.enforce_story_creator_permissions();

create or replace function public.enforce_creator_chapter_limit()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  admin_user_id constant uuid := '931bf7f4-4e68-4689-8607-cd5a28507011';
  current_owner uuid;
  chapter_total integer;
begin
  if (select auth.uid()) = admin_user_id then
    return new;
  end if;
  select g.owner_id into current_owner
  from public.gardens g where g.id = new.garden_id;
  if current_owner is null or current_owner <> (select auth.uid()) then
    raise exception 'A creator can only add chapters to their own story';
  end if;
  select count(*) into chapter_total
  from public.garden_chapters c where c.garden_id = new.garden_id;
  if chapter_total >= 8 then
    raise exception 'Creator accounts can add up to 8 chapters per story';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_creator_chapter_limit on public.garden_chapters;
create trigger enforce_creator_chapter_limit
before insert on public.garden_chapters
for each row execute function public.enforce_creator_chapter_limit();

drop policy if exists garden_share_secrets_owner_access on public.garden_share_secrets;
create policy garden_share_secrets_admin_only
  on public.garden_share_secrets
  for all to authenticated
  using ((select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid)
  with check ((select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid);

drop policy if exists garden_guestbook_owner_read on public.garden_guestbook;
drop policy if exists garden_guestbook_owner_update on public.garden_guestbook;
drop policy if exists garden_guestbook_owner_delete on public.garden_guestbook;
create policy garden_guestbook_admin_read
  on public.garden_guestbook for select to authenticated
  using ((select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid);
create policy garden_guestbook_admin_update
  on public.garden_guestbook for update to authenticated
  using ((select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid)
  with check ((select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid);
create policy garden_guestbook_admin_delete
  on public.garden_guestbook for delete to authenticated
  using ((select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid);

drop policy if exists garden_photos_insert_owner on storage.objects;
create policy garden_photos_insert_owner
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'garden-photos'
    and exists (
      select 1 from public.gardens g
      where g.id::text = (storage.foldername(objects.name))[1]
        and g.owner_id = (select auth.uid())
    )
  );
