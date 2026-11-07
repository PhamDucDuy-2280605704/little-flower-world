-- Read-only preflight checks. Run this BEFORE the personalized-garden migration.
-- Paste the results back for review. This script does not change any data.

-- 1) Confirm that story_progress exists.
select to_regclass('public.story_progress') as story_progress_table;

-- 2) Inspect the actual column types and nullability.
select
  column_name,
  data_type,
  udt_name,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'story_progress'
order by ordinal_position;

-- 3) Check for duplicate pairs that would prevent the unique index.
select
  user_id,
  chapter_id,
  count(*) as duplicate_rows
from public.story_progress
group by user_id, chapter_id
having count(*) > 1
order by duplicate_rows desc;

-- 4) Inspect existing unique indexes / constraints.
select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'story_progress'
order by indexname;

-- 5) Check whether RLS is currently enabled on story_progress.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'story_progress';

-- 6) List existing policies. Review these before assuming access is isolated.
select
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'story_progress'
order by policyname;
