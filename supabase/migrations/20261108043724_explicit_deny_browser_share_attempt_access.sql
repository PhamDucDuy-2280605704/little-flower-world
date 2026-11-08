drop policy if exists garden_share_attempts_no_browser_access on public.garden_share_attempts;
create policy garden_share_attempts_no_browser_access
  on public.garden_share_attempts
  for all to anon, authenticated
  using (false)
  with check (false);
