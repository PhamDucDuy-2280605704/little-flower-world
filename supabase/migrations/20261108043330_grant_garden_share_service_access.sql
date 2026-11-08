-- Grant the server-side Edge Function access to the published garden payload
-- and private PIN/guestbook/rate-limit tables. No browser role is granted this access.
grant select, insert, update, delete
  on public.gardens,
     public.garden_items,
     public.garden_chapters,
     public.garden_share_secrets,
     public.garden_guestbook,
     public.garden_share_attempts
  to service_role;
