-- Validate cover paths before resubmission logic and avoid demoting a corrected rejection.
create or replace function public.enforce_story_creator_permissions()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  admin_user_id constant uuid := '931bf7f4-4e68-4689-8607-cd5a28507011';
  content_changed boolean := false;
  resubmitting_rejected_story boolean := false;
begin
  if (select auth.uid()) = admin_user_id then
    if new.approval_status = 'rejected' then
      new.is_published := false;
      new.share_slug := null;
      new.published_at := null;
    end if;
    if new.is_published and new.approval_status <> 'approved' then raise exception 'Story must be approved before publishing'; end if;
    return new;
  end if;
  if (select auth.uid()) is null then raise exception 'Authentication is required to edit a story'; end if;
  if tg_op = 'INSERT' then
    if new.owner_id is distinct from (select auth.uid()) then raise exception 'A creator can only create stories for their own account'; end if;
    new.approval_status := 'draft';
    new.is_published := false;
    new.share_slug := null;
    new.published_at := null;
    new.guestbook_enabled := false;
    return new;
  end if;
  if new.owner_id is distinct from old.owner_id or old.owner_id is distinct from (select auth.uid()) then
    raise exception 'A creator cannot transfer or edit another account story';
  end if;
  if new.is_published is distinct from old.is_published
     or new.share_slug is distinct from old.share_slug
     or new.published_at is distinct from old.published_at
     or new.guestbook_enabled is distinct from old.guestbook_enabled then
    raise exception 'Publishing, share links, PIN and guestbook controls are Admin-only';
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
  if old.approval_status = 'pending' and content_changed then raise exception 'A story awaiting review cannot be edited'; end if;
  if old.approval_status = 'approved' and new.approval_status is distinct from old.approval_status and not content_changed then
    raise exception 'An approved story can only be changed after editing its content';
  end if;
  if new.approval_status in ('approved', 'rejected') and new.approval_status is distinct from old.approval_status then
    raise exception 'Only Admin can approve or reject a story';
  end if;
  resubmitting_rejected_story :=
    old.approval_status = 'rejected'
    and new.approval_status = 'pending'
    and content_changed;
  if old.approval_status in ('approved', 'rejected') and content_changed and not resubmitting_rejected_story then
    new.approval_status := 'draft';
    new.is_published := false;
    new.share_slug := null;
    new.published_at := null;
  end if;
  return new;
end;
$$;
