-- Writers can read and moderate notes on their own stories.
-- Guests still submit via the service-role Edge Function; only Admin or the owner can read/moderate.

create policy garden_guestbook_owner_read
  on public.garden_guestbook
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.gardens g
      where g.id = garden_guestbook.garden_id
        and g.owner_id = (select auth.uid())
    )
  );

create policy garden_guestbook_owner_update
  on public.garden_guestbook
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.gardens g
      where g.id = garden_guestbook.garden_id
        and g.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.gardens g
      where g.id = garden_guestbook.garden_id
        and g.owner_id = (select auth.uid())
    )
  );

create or replace function public.protect_garden_guestbook_owner_updates()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
declare
  admin_user_id constant uuid := '931bf7f4-4e68-4689-8607-cd5a28507011';
begin
  if (select auth.uid()) = admin_user_id then
    return new;
  end if;

  if (select auth.uid()) is null then
    raise exception 'Authentication is required to moderate reader notes';
  end if;

  if new.id is distinct from old.id
     or new.garden_id is distinct from old.garden_id
     or new.guest_name is distinct from old.guest_name
     or new.message is distinct from old.message
     or new.created_at is distinct from old.created_at then
    raise exception 'Writers may only change the moderation status of reader notes';
  end if;

  if new.status not in ('approved', 'rejected') then
    raise exception 'Writers may approve or hide reader notes only';
  end if;

  if not exists (
    select 1
    from public.gardens g
    where g.id = old.garden_id
      and g.owner_id = (select auth.uid())
  ) then
    raise exception 'A writer can only moderate notes on their own stories';
  end if;

  return new;
end;
$function$;

drop trigger if exists protect_garden_guestbook_owner_updates on public.garden_guestbook;
create trigger protect_garden_guestbook_owner_updates
before update on public.garden_guestbook
for each row
execute function public.protect_garden_guestbook_owner_updates();
