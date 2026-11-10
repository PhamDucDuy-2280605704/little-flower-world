create table if not exists public.account_signup_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists account_signup_attempts_ip_created_idx
  on public.account_signup_attempts (ip_hash, created_at desc);
alter table public.account_signup_attempts enable row level security;
revoke all on public.account_signup_attempts from anon, authenticated;
grant all on public.account_signup_attempts to service_role;

create or replace function public.allow_account_signup(p_ip text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ip_hash text;
  v_attempts integer;
begin
  v_ip_hash := encode(extensions.digest(coalesce(nullif(p_ip, ''), 'unknown'), 'sha256'), 'hex');
  delete from public.account_signup_attempts where created_at < now() - interval '24 hours';
  select count(*)::integer into v_attempts
    from public.account_signup_attempts
    where ip_hash = v_ip_hash and created_at >= now() - interval '1 hour';
  if coalesce(v_attempts, 0) >= 10 then
    return false;
  end if;
  insert into public.account_signup_attempts (ip_hash) values (v_ip_hash);
  return true;
end;
$$;
revoke all on function public.allow_account_signup(text) from public, anon, authenticated;
grant execute on function public.allow_account_signup(text) to service_role;
