create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.account_recovery_pins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  pin_hash text not null,
  failed_attempts smallint not null default 0 check (failed_attempts >= 0),
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists account_recovery_pins_email_lower_uidx
  on public.account_recovery_pins (lower(email));
alter table public.account_recovery_pins enable row level security;
revoke all on public.account_recovery_pins from anon, authenticated;
grant all on public.account_recovery_pins to service_role;

create table if not exists public.account_recovery_attempts (
  id bigint generated always as identity primary key,
  email_hash text not null,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists account_recovery_attempts_email_created_idx
  on public.account_recovery_attempts (email_hash, created_at desc);
create index if not exists account_recovery_attempts_ip_created_idx
  on public.account_recovery_attempts (ip_hash, created_at desc);
alter table public.account_recovery_attempts enable row level security;
revoke all on public.account_recovery_attempts from anon, authenticated;
grant all on public.account_recovery_attempts to service_role;

create or replace function private.capture_signup_recovery_pin()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_pin text;
begin
  v_pin := new.raw_user_meta_data ->> 'recovery_pin';
  if v_pin is null then return new; end if;
  if new.email is null or v_pin !~ '^[0-9]{6}$' then
    raise exception 'A valid six-digit recovery PIN is required';
  end if;
  insert into public.account_recovery_pins (user_id, email, pin_hash)
  values (new.id, lower(new.email), extensions.crypt(v_pin, extensions.gen_salt('bf', 12)))
  on conflict (user_id) do update
    set email = excluded.email, pin_hash = excluded.pin_hash,
        failed_attempts = 0, locked_until = null, updated_at = now();
  update auth.users
    set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) - 'recovery_pin'
    where id = new.id;
  return new;
end;
$$;
drop trigger if exists on_auth_user_capture_recovery_pin on auth.users;
create trigger on_auth_user_capture_recovery_pin after insert on auth.users
  for each row execute function private.capture_signup_recovery_pin();

create or replace function private.sync_recovery_pin_email()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.account_recovery_pins set email = lower(new.email), updated_at = now()
  where user_id = new.id and new.email is not null;
  return new;
end;
$$;
drop trigger if exists on_auth_user_sync_recovery_email on auth.users;
create trigger on_auth_user_sync_recovery_email after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function private.sync_recovery_pin_email();

create or replace function public.set_own_account_recovery_pin(p_pin text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid := auth.uid(); v_email text; v_email_hash text;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_pin is null or p_pin !~ '^[0-9]{6}$' then
    raise exception 'PIN must contain exactly six digits' using errcode = '22023';
  end if;
  select lower(email) into v_email from auth.users where id = v_user_id;
  if v_email is null then raise exception 'Account email is unavailable' using errcode = '22023'; end if;
  insert into public.account_recovery_pins (user_id, email, pin_hash, failed_attempts, locked_until)
  values (v_user_id, v_email, extensions.crypt(p_pin, extensions.gen_salt('bf', 12)), 0, null)
  on conflict (user_id) do update
    set email = excluded.email, pin_hash = excluded.pin_hash,
        failed_attempts = 0, locked_until = null, updated_at = now();
  v_email_hash := encode(extensions.digest(v_email, 'sha256'), 'hex');
  delete from public.account_recovery_attempts where email_hash = v_email_hash;
  return true;
end;
$$;
revoke all on function public.set_own_account_recovery_pin(text) from public, anon;
grant execute on function public.set_own_account_recovery_pin(text) to authenticated;

create or replace function public.has_own_account_recovery_pin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.account_recovery_pins p where p.user_id = auth.uid()
  );
$$;
revoke all on function public.has_own_account_recovery_pin() from public, anon;
grant execute on function public.has_own_account_recovery_pin() to authenticated;

create or replace function public.verify_account_recovery_pin(p_email text, p_pin text, p_ip text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_email text; v_email_hash text; v_ip_hash text; v_user_id uuid;
  v_pin_hash text; v_email_attempts integer; v_ip_attempts integer;
begin
  if p_email is null or length(p_email) > 254 or p_pin is null or p_pin !~ '^[0-9]{6}$' then return null; end if;
  v_email := lower(btrim(p_email));
  v_email_hash := encode(extensions.digest(v_email, 'sha256'), 'hex');
  v_ip_hash := encode(extensions.digest(coalesce(nullif(p_ip, ''), 'unknown'), 'sha256'), 'hex');
  delete from public.account_recovery_attempts where created_at < now() - interval '24 hours';
  select count(*)::integer into v_email_attempts from public.account_recovery_attempts
    where email_hash = v_email_hash and created_at >= now() - interval '15 minutes';
  select count(*)::integer into v_ip_attempts from public.account_recovery_attempts
    where ip_hash = v_ip_hash and created_at >= now() - interval '15 minutes';
  if coalesce(v_email_attempts, 0) >= 8 or coalesce(v_ip_attempts, 0) >= 30 then return null; end if;
  insert into public.account_recovery_attempts (email_hash, ip_hash) values (v_email_hash, v_ip_hash);
  select p.user_id, p.pin_hash into v_user_id, v_pin_hash
    from public.account_recovery_pins p where p.email = v_email for update;
  if v_user_id is null or v_pin_hash is null then return null; end if;
  if p.locked_until is not null and p.locked_until > now() then return null; end if;
  if v_pin_hash = extensions.crypt(p_pin, v_pin_hash) then
    delete from public.account_recovery_attempts where email_hash = v_email_hash;
    update public.account_recovery_pins set failed_attempts = 0, locked_until = null where user_id = v_user_id;
    return v_user_id;
  end if;
  update public.account_recovery_pins
    set failed_attempts = failed_attempts + 1,
        locked_until = case when failed_attempts + 1 >= 8 then now() + interval '15 minutes' else locked_until end
    where user_id = v_user_id;
  return null;
end;
$$;
revoke all on function public.verify_account_recovery_pin(text, text, text) from public, anon, authenticated;
grant execute on function public.verify_account_recovery_pin(text, text, text) to service_role;
revoke all on function private.capture_signup_recovery_pin() from public, anon, authenticated;
revoke all on function private.sync_recovery_pin_email() from public, anon, authenticated;
