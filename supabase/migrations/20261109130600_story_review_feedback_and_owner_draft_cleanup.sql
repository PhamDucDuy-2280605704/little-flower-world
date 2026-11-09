-- Persist Admin feedback on each story and let owners remove only their own private drafts' photos.
alter table public.gardens
  add column if not exists review_comment text,
  add column if not exists reviewed_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.gardens'::regclass
      and conname = 'gardens_review_comment_length_check'
  ) then
    alter table public.gardens
      add constraint gardens_review_comment_length_check
      check (review_comment is null or char_length(review_comment) <= 3000);
  end if;
end;
$$;

create or replace function public.protect_garden_review_feedback()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  admin_user_id constant uuid := '931bf7f4-4e68-4689-8607-cd5a28507011';
begin
  if tg_op = 'INSERT' then
    if (select auth.uid()) is distinct from admin_user_id then
      new.review_comment := null;
      new.reviewed_at := null;
    elsif new.review_comment is not null or new.approval_status in ('approved', 'rejected') then
      new.reviewed_at := now();
    end if;
    return new;
  end if;

  if (select auth.uid()) = admin_user_id then
    if new.approval_status is distinct from old.approval_status
      or new.review_comment is distinct from old.review_comment then
      new.reviewed_at := now();
    end if;
    return new;
  end if;

  if new.review_comment is distinct from old.review_comment
    or new.reviewed_at is distinct from old.reviewed_at then
    raise exception 'Only Admin can write story review feedback';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_garden_review_feedback on public.gardens;
create trigger protect_garden_review_feedback
before insert or update on public.gardens
for each row execute function public.protect_garden_review_feedback();

drop policy if exists garden_photos_delete_owner on storage.objects;
create policy garden_photos_delete_owner
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'garden-photos'
    and exists (
      select 1
      from public.gardens g
      where g.id::text = (storage.foldername(objects.name))[1]
        and g.owner_id = (select auth.uid())
        and g.approval_status in ('draft', 'rejected')
        and g.is_published = false
    )
  );
