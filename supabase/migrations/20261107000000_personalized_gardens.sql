-- Little Flower World: private garden data per authenticated account.
-- Apply once in Supabase Dashboard > SQL Editor.
-- Garden content is owner-managed through the Dashboard/SQL Editor.
-- Signed-in visitors receive read-only access to their own garden.

create table if not exists public.gardens (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users (id) on delete cascade,
  name text not null,
  introduction text not null default '',
  letter_title text not null default 'Lá thư cuối',
  letter_paragraphs jsonb not null default '[]'::jsonb,
  letter_signature text not null default '',
  created_at timestamptz not null default now(),
  constraint gardens_letter_paragraphs_is_array
    check (jsonb_typeof(letter_paragraphs) = 'array')
);

create table if not exists public.garden_chapters (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid not null references public.gardens (id) on delete cascade,
  chapter_id text not null,
  sort_order integer not null default 1,
  title text not null,
  paragraphs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint garden_chapters_garden_chapter_unique unique (garden_id, chapter_id),
  constraint garden_chapters_paragraphs_is_array
    check (jsonb_typeof(paragraphs) = 'array')
);

create table if not exists public.garden_items (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid not null references public.gardens (id) on delete cascade,
  kind text not null check (
    kind in ('daisy', 'tulip', 'sunflower', 'rose', 'lavender', 'cherry', 'lotus', 'dandelion')
  ),
  color text not null,
  x double precision not null check (x >= 0 and x <= 100),
  depth double precision not null check (depth >= 0 and depth <= 1),
  size double precision not null check (size > 0 and size <= 3),
  chapter_id text,
  label text,
  title text,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  constraint garden_items_chapter_fk
    foreign key (garden_id, chapter_id)
    references public.garden_chapters (garden_id, chapter_id)
    on delete cascade
);

create index if not exists garden_chapters_garden_sort_idx
  on public.garden_chapters (garden_id, sort_order);

create index if not exists garden_items_garden_sort_idx
  on public.garden_items (garden_id, sort_order);

-- Keep the existing story_progress table/data. Create it only when it is absent.
create table if not exists public.story_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  chapter_id text not null,
  created_at timestamptz not null default now()
);

-- Verify the existing table is compatible before adding the unique index/RLS.
do $$
declare
  user_id_type text;
  chapter_id_type text;
  duplicate_count bigint;
begin
  select udt_name into user_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'story_progress'
    and column_name = 'user_id';

  select udt_name into chapter_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'story_progress'
    and column_name = 'chapter_id';

  if user_id_type is distinct from 'uuid' then
    raise exception 'story_progress.user_id must be uuid (found: %). Inspect the existing column before migrating.', user_id_type;
  end if;

  if chapter_id_type is distinct from 'text' then
    raise exception 'story_progress.chapter_id must be text (found: %). Inspect the existing column before migrating.', chapter_id_type;
  end if;

  select count(*) into duplicate_count
  from (
    select user_id, chapter_id
    from public.story_progress
    group by user_id, chapter_id
    having count(*) > 1
  ) duplicates;

  if duplicate_count > 0 then
    raise exception 'story_progress contains duplicate (user_id, chapter_id) pairs. Resolve duplicates before adding the unique index.';
  end if;
end $$;

create unique index if not exists story_progress_user_chapter_uidx
  on public.story_progress (user_id, chapter_id);

-- Enable RLS on every table exposed to the Supabase Data API.
alter table public.gardens enable row level security;
alter table public.garden_chapters enable row level security;
alter table public.garden_items enable row level security;
alter table public.story_progress enable row level security;

-- End users can read their own garden, but cannot change its design/content.
revoke all on table public.gardens, public.garden_chapters, public.garden_items
  from anon, authenticated;
grant select on table public.gardens, public.garden_chapters, public.garden_items
  to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'gardens'
      and policyname = 'gardens_select_owner'
  ) then
    create policy gardens_select_owner
      on public.gardens for select to authenticated
      using ((select auth.uid()) = owner_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'garden_chapters'
      and policyname = 'garden_chapters_select_owner'
  ) then
    create policy garden_chapters_select_owner
      on public.garden_chapters for select to authenticated
      using (
        exists (
          select 1 from public.gardens g
          where g.id = garden_id and g.owner_id = (select auth.uid())
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'garden_items'
      and policyname = 'garden_items_select_owner'
  ) then
    create policy garden_items_select_owner
      on public.garden_items for select to authenticated
      using (
        exists (
          select 1 from public.gardens g
          where g.id = garden_id and g.owner_id = (select auth.uid())
        )
      );
  end if;
end $$;

-- Story progress remains writable by its owner only, and only for chapters
-- belonging to that owner's garden. Restrictive policies also constrain any
-- older permissive policies that may already exist on story_progress.
revoke all on table public.story_progress from anon, authenticated;
grant select, insert, update on table public.story_progress to authenticated;

drop policy if exists story_progress_select_owner on public.story_progress;
drop policy if exists story_progress_insert_owner on public.story_progress;
drop policy if exists story_progress_update_owner on public.story_progress;
drop policy if exists story_progress_select_owner_guard on public.story_progress;
drop policy if exists story_progress_insert_owner_guard on public.story_progress;
drop policy if exists story_progress_update_owner_guard on public.story_progress;

create policy story_progress_select_owner
  on public.story_progress as permissive for select to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.gardens g
      join public.garden_chapters c on c.garden_id = g.id
      where g.owner_id = (select auth.uid())
        and c.chapter_id = story_progress.chapter_id
    )
  );

create policy story_progress_select_owner_guard
  on public.story_progress as restrictive for select to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.gardens g
      join public.garden_chapters c on c.garden_id = g.id
      where g.owner_id = (select auth.uid())
        and c.chapter_id = story_progress.chapter_id
    )
  );

create policy story_progress_insert_owner
  on public.story_progress as permissive for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.gardens g
      join public.garden_chapters c on c.garden_id = g.id
      where g.owner_id = (select auth.uid())
        and c.chapter_id = story_progress.chapter_id
    )
  );

create policy story_progress_insert_owner_guard
  on public.story_progress as restrictive for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.gardens g
      join public.garden_chapters c on c.garden_id = g.id
      where g.owner_id = (select auth.uid())
        and c.chapter_id = story_progress.chapter_id
    )
  );

create policy story_progress_update_owner
  on public.story_progress as permissive for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.gardens g
      join public.garden_chapters c on c.garden_id = g.id
      where g.owner_id = (select auth.uid())
        and c.chapter_id = story_progress.chapter_id
    )
  );

create policy story_progress_update_owner_guard
  on public.story_progress as restrictive for update to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.gardens g
      join public.garden_chapters c on c.garden_id = g.id
      where g.owner_id = (select auth.uid())
        and c.chapter_id = story_progress.chapter_id
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.gardens g
      join public.garden_chapters c on c.garden_id = g.id
      where g.owner_id = (select auth.uid())
        and c.chapter_id = story_progress.chapter_id
    )
  );
