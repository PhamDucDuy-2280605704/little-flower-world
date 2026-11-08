-- Consolidate duplicate permissive policies without widening access.
-- Keep the restrictive guard policies as defense in depth.

drop policy if exists gardens_select_admin on public.gardens;
drop policy if exists gardens_select_owner on public.gardens;
drop policy if exists gardens_select_access on public.gardens;
create policy gardens_select_access
on public.gardens
as permissive
for select
to authenticated
using (
  owner_id = (select auth.uid())
  or (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid
);

drop policy if exists garden_chapters_select_admin on public.garden_chapters;
drop policy if exists garden_chapters_select_owner on public.garden_chapters;
drop policy if exists garden_chapters_select_access on public.garden_chapters;
create policy garden_chapters_select_access
on public.garden_chapters
as permissive
for select
to authenticated
using (
  exists (
    select 1
    from public.gardens g
    where g.id = garden_chapters.garden_id
      and (
        g.owner_id = (select auth.uid())
        or (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid
      )
  )
);

drop policy if exists garden_items_select_admin on public.garden_items;
drop policy if exists garden_items_select_owner on public.garden_items;
drop policy if exists garden_items_select_access on public.garden_items;
create policy garden_items_select_access
on public.garden_items
as permissive
for select
to authenticated
using (
  exists (
    select 1
    from public.gardens g
    where g.id = garden_items.garden_id
      and (
        g.owner_id = (select auth.uid())
        or (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid
      )
  )
);

drop policy if exists "Users can view their own progress" on public.story_progress;
drop policy if exists "Users can add their own progress" on public.story_progress;
drop policy if exists "Users can update their own progress" on public.story_progress;

create index if not exists garden_items_garden_chapter_idx
  on public.garden_items (garden_id, chapter_id);

-- These functions are trigger/event-trigger handlers, not public RPC endpoints.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
