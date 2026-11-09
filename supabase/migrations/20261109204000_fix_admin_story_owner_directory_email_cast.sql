-- auth.users.email is varchar; cast explicitly to match the RPC's declared text result.
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
    u.email::text,
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
