create or replace function public.verify_account_recovery_pin(p_email text, p_pin text, p_ip text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_email text; v_email_hash text; v_ip_hash text; v_user_id uuid;
  v_pin_hash text; v_locked_until timestamptz;
  v_email_attempts integer; v_ip_attempts integer;
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
  select p.user_id, p.pin_hash, p.locked_until
    into v_user_id, v_pin_hash, v_locked_until
    from public.account_recovery_pins p where p.email = v_email for update;
  if v_user_id is null or v_pin_hash is null then return null; end if;
  if v_locked_until is not null and v_locked_until > now() then return null; end if;
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
