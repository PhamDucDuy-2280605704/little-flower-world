-- Permit approved story owners to manage publication and optional reader settings.
-- Admin remains the only role that can approve or reject stories.

create or replace function public.enforce_story_creator_permissions()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
declare
  admin_user_id constant uuid := '931bf7f4-4e68-4689-8607-cd5a28507011';
  content_changed boolean := false;
  resubmitting_rejected_story boolean := false;
  reopening_approved_story boolean := false;
  owner_publishing_approved_story boolean := false;
  owner_configuring_approved_story boolean := false;
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

  reopening_approved_story :=
    old.approval_status = 'approved'
    and new.approval_status = 'draft';

  owner_publishing_approved_story :=
    old.approval_status = 'approved'
    and new.approval_status = 'approved'
    and old.owner_id = (select auth.uid())
    and (
      new.is_published is distinct from old.is_published
      or new.share_slug is distinct from old.share_slug
      or new.published_at is distinct from old.published_at
    );

  owner_configuring_approved_story :=
    old.approval_status = 'approved'
    and new.approval_status = 'approved'
    and old.owner_id = (select auth.uid());

  if new.guestbook_enabled is distinct from old.guestbook_enabled
     and not owner_configuring_approved_story then
    raise exception 'Only Admin or the approved story owner can change reader-note settings';
  end if;

  if (
    new.is_published is distinct from old.is_published
    or new.share_slug is distinct from old.share_slug
    or new.published_at is distinct from old.published_at
  ) and not reopening_approved_story
      and not owner_publishing_approved_story then
    raise exception 'Only Admin or the approved story owner can publish a story';
  end if;

  if reopening_approved_story then
    new.is_published := false;
    new.share_slug := null;
    new.published_at := null;
  elsif owner_publishing_approved_story then
    if new.is_published then
      if nullif(btrim(new.share_slug), '') is null then
        raise exception 'A public share link is required before publishing';
      end if;
      new.published_at := coalesce(new.published_at, now());
    else
      new.published_at := null;
    end if;
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

  if old.approval_status = 'pending' and content_changed then
    raise exception 'A story awaiting review cannot be edited';
  end if;

  if old.approval_status = 'approved'
     and new.approval_status is distinct from old.approval_status
     and not reopening_approved_story
     and not content_changed then
    raise exception 'An approved story can only be changed after editing its content or explicitly reopening it';
  end if;

  if new.approval_status in ('approved', 'rejected')
     and new.approval_status is distinct from old.approval_status then
    raise exception 'Only Admin can approve or reject a story';
  end if;

  resubmitting_rejected_story :=
    old.approval_status = 'rejected'
    and new.approval_status = 'pending'
    and content_changed;

  if old.approval_status in ('approved', 'rejected')
     and content_changed
     and not resubmitting_rejected_story then
    new.approval_status := 'draft';
    new.is_published := false;
    new.share_slug := null;
    new.published_at := null;
  end if;

  return new;
end;
$function$;

-- Approved owners can add, update or remove their own story PIN.
drop policy if exists garden_share_secrets_owner_approved on public.garden_share_secrets;
create policy garden_share_secrets_owner_approved
  on public.garden_share_secrets
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.gardens g
      where g.id = garden_share_secrets.garden_id
        and g.owner_id = (select auth.uid())
        and g.approval_status = 'approved'
    )
  )
  with check (
    exists (
      select 1
      from public.gardens g
      where g.id = garden_share_secrets.garden_id
        and g.owner_id = (select auth.uid())
        and g.approval_status = 'approved'
    )
  );

-- A private Admin-only directory of the User accounts that own stories.
create or replace function public.admin_story_owner_directory()
returns table (
  owner_id uuid,
  display_name text,
  email text,
  story_count bigint
)
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth', 'pg_temp'
as $function$
declare
  admin_user_id constant uuid := '931bf7f4-4e68-4689-8607-cd5a28507011';
begin
  if (select auth.uid()) is distinct from admin_user_id then
    raise exception 'Admin access is required';
  end if;

  return query
  select
    g.owner_id,
    coalesce(
      nullif(btrim(p.display_name), ''),
      nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
      nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
      'Tài khoản ' || left(g.owner_id::text, 8)
    ) as display_name,
    u.email,
    count(*)::bigint as story_count
  from public.gardens g
  left join public.profiles p on p.id = g.owner_id
  left join auth.users u on u.id = g.owner_id
  where g.owner_id <> admin_user_id
  group by g.owner_id, p.display_name, u.raw_user_meta_data, u.email
  order by lower(coalesce(
    nullif(btrim(p.display_name), ''),
    nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    'Tài khoản ' || left(g.owner_id::text, 8)
  ));
end;
$function$;

revoke all on function public.admin_story_owner_directory() from public, anon;
grant execute on function public.admin_story_owner_directory() to authenticated;
