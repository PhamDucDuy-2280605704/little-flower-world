-- Remove direct RPC execution for the definer-rights quota trigger.
revoke execute on function public.enforce_creator_story_photo_quota() from public, anon, authenticated;
grant execute on function public.enforce_creator_story_photo_quota() to postgres;
