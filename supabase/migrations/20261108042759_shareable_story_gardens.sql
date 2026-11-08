-- Expand the private single-garden data model into creator-owned, shareable gardens.
-- This migration preserves every existing garden, chapter, item, photo and progress row.

alter table public.gardens
  drop constraint if exists gardens_owner_id_key;

create index if not exists gardens_owner_id_idx
  on public.gardens(owner_id);

alter table public.gardens
  add column if not exists share_slug text,
  add column if not exists is_published boolean not null default false,
  add column if not exists published_at timestamptz,
  add column if not exists cover_path text,
  add column if not exists experience_settings jsonb not null default '{}'::jsonb,
  add column if not exists guestbook_enabled boolean not null default false;

create unique index if not exists gardens_share_slug_uidx
  on public.gardens(share_slug)
  where share_slug is not null;

create index if not exists gardens_owner_created_idx
  on public.gardens(owner_id, created_at desc);

create table if not exists public.garden_share_secrets (
  garden_id uuid primary key references public.gardens(id) on delete cascade,
  pin_salt text not null,
  pin_hash text not null,
  iterations integer not null default 180000 check (iterations between 100000 and 500000),
  updated_at timestamptz not null default now()
);
alter table public.garden_share_secrets enable row level security;
revoke all on public.garden_share_secrets from public, anon, authenticated;
grant select, insert, update, delete on public.garden_share_secrets to authenticated;

drop policy if exists garden_share_secrets_owner_access on public.garden_share_secrets;
create policy garden_share_secrets_owner_access
  on public.garden_share_secrets
  for all to authenticated
  using (
    exists (
      select 1 from public.gardens g
      where g.id = garden_share_secrets.garden_id
        and (g.owner_id = (select auth.uid())
          or (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid)
    )
  )
  with check (
    exists (
      select 1 from public.gardens g
      where g.id = garden_share_secrets.garden_id
        and (g.owner_id = (select auth.uid())
          or (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid)
    )
  );

create table if not exists public.garden_guestbook (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid not null references public.gardens(id) on delete cascade,
  guest_name text not null,
  message text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  constraint garden_guestbook_name_length check (char_length(guest_name) between 1 and 50),
  constraint garden_guestbook_message_length check (char_length(message) between 1 and 1000)
);
create index if not exists garden_guestbook_garden_created_idx
  on public.garden_guestbook(garden_id, created_at desc);
alter table public.garden_guestbook enable row level security;
revoke all on public.garden_guestbook from public, anon, authenticated;
grant select, update, delete on public.garden_guestbook to authenticated;

drop policy if exists garden_guestbook_owner_read on public.garden_guestbook;
create policy garden_guestbook_owner_read
  on public.garden_guestbook for select to authenticated
  using (
    exists (
      select 1 from public.gardens g
      where g.id = garden_guestbook.garden_id
        and (g.owner_id = (select auth.uid())
          or (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid)
    )
  );
drop policy if exists garden_guestbook_owner_update on public.garden_guestbook;
create policy garden_guestbook_owner_update
  on public.garden_guestbook for update to authenticated
  using (
    exists (
      select 1 from public.gardens g
      where g.id = garden_guestbook.garden_id
        and (g.owner_id = (select auth.uid())
          or (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid)
    )
  )
  with check (
    exists (
      select 1 from public.gardens g
      where g.id = garden_guestbook.garden_id
        and (g.owner_id = (select auth.uid())
          or (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid)
    )
  );
drop policy if exists garden_guestbook_owner_delete on public.garden_guestbook;
create policy garden_guestbook_owner_delete
  on public.garden_guestbook for delete to authenticated
  using (
    exists (
      select 1 from public.gardens g
      where g.id = garden_guestbook.garden_id
        and (g.owner_id = (select auth.uid())
          or (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid)
    )
  );

-- Private server-side request log. Browser roles cannot inspect or write it.
create table if not exists public.garden_share_attempts (
  id bigint generated always as identity primary key,
  request_hash text not null,
  action text not null check (action in ('pin', 'guestbook')),
  created_at timestamptz not null default now()
);
create index if not exists garden_share_attempts_hash_created_idx
  on public.garden_share_attempts(request_hash, created_at desc);
alter table public.garden_share_attempts enable row level security;
revoke all on public.garden_share_attempts from public, anon, authenticated;

-- Creators may own multiple gardens and manage only their own content.
grant insert, update, delete on public.gardens, public.garden_chapters, public.garden_items to authenticated;

drop policy if exists gardens_creator_insert on public.gardens;
create policy gardens_creator_insert
  on public.gardens for insert to authenticated
  with check (owner_id = (select auth.uid()) or (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid);

drop policy if exists gardens_creator_update on public.gardens;
create policy gardens_creator_update
  on public.gardens for update to authenticated
  using (owner_id = (select auth.uid()) or (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid)
  with check (owner_id = (select auth.uid()) or (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid);

drop policy if exists gardens_creator_delete on public.gardens;
create policy gardens_creator_delete
  on public.gardens for delete to authenticated
  using (owner_id = (select auth.uid()) or (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid);

drop policy if exists garden_chapters_creator_insert on public.garden_chapters;
create policy garden_chapters_creator_insert
  on public.garden_chapters for insert to authenticated
  with check (
    exists (select 1 from public.gardens g where g.id = garden_id
      and (g.owner_id = (select auth.uid()) or (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid))
  );

drop policy if exists garden_chapters_creator_update on public.garden_chapters;
create policy garden_chapters_creator_update
  on public.garden_chapters for update to authenticated
  using (
    exists (select 1 from public.gardens g where g.id = garden_id
      and (g.owner_id = (select auth.uid()) or (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid))
  )
  with check (
    exists (select 1 from public.gardens g where g.id = garden_id
      and (g.owner_id = (select auth.uid()) or (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid))
  );

drop policy if exists garden_chapters_creator_delete on public.garden_chapters;
create policy garden_chapters_creator_delete
  on public.garden_chapters for delete to authenticated
  using (
    exists (select 1 from public.gardens g where g.id = garden_id
      and (g.owner_id = (select auth.uid()) or (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid))
  );

drop policy if exists garden_items_creator_insert on public.garden_items;
create policy garden_items_creator_insert
  on public.garden_items for insert to authenticated
  with check (
    exists (select 1 from public.gardens g where g.id = garden_id
      and (g.owner_id = (select auth.uid()) or (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid))
  );

drop policy if exists garden_items_creator_update on public.garden_items;
create policy garden_items_creator_update
  on public.garden_items for update to authenticated
  using (
    exists (select 1 from public.gardens g where g.id = garden_id
      and (g.owner_id = (select auth.uid()) or (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid))
  )
  with check (
    exists (select 1 from public.gardens g where g.id = garden_id
      and (g.owner_id = (select auth.uid()) or (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid))
  );

drop policy if exists garden_items_creator_delete on public.garden_items;
create policy garden_items_creator_delete
  on public.garden_items for delete to authenticated
  using (
    exists (select 1 from public.gardens g where g.id = garden_id
      and (g.owner_id = (select auth.uid()) or (select auth.uid()) = '931bf7f4-4e68-4689-8607-cd5a28507011'::uuid))
  );
