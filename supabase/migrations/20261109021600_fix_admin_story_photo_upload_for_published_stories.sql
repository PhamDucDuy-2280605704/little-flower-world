-- Use the Storage-owned object identity for the Admin bypass.
-- Storage populates owner_id/owner from the authenticated request; auth.uid()
-- can be unavailable inside Storage's definer-rights transaction trigger.
-- Keep non-Admin ownership, review-state, MIME, and five-photo checks unchanged.
CREATE OR REPLACE FUNCTION public.enforce_creator_story_photo_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage, pg_temp
AS $$
DECLARE
  admin_user_id CONSTANT uuid := '931bf7f4-4e68-4689-8607-cd5a28507011';
  request_user_id text;
  story_folder text;
  story_owner uuid;
  story_status text;
  story_is_published boolean;
  photo_count integer;
BEGIN
  IF new.bucket_id <> 'garden-photos' THEN
    RETURN new;
  END IF;

  -- Prefer the identity attached by Supabase Storage to the new object.
  -- Fall back to the legacy owner field, then auth.uid() for compatible
  -- authenticated callers. Do not base the Admin exception on user metadata.
  request_user_id := COALESCE(
    NULLIF(new.owner_id, ''),
    new.owner::text,
    (SELECT auth.uid())::text
  );

  IF request_user_id = admin_user_id::text THEN
    RETURN new;
  END IF;

  story_folder := (storage.foldername(new.name))[1];

  SELECT g.owner_id, g.approval_status, g.is_published
    INTO story_owner, story_status, story_is_published
  FROM public.gardens g
  WHERE g.id::text = story_folder;

  -- Fail closed when Storage did not provide an authenticated owner.
  IF story_owner IS NULL OR story_owner::text IS DISTINCT FROM request_user_id THEN
    RAISE EXCEPTION 'A creator can only upload photos to their own story';
  END IF;

  IF story_status NOT IN ('draft', 'rejected') OR story_is_published THEN
    RAISE EXCEPTION 'Photos cannot be added while a story is under review or published';
  END IF;

  IF COALESCE(new.metadata->>'mimetype', '') NOT LIKE 'image/%' THEN
    RAISE EXCEPTION 'Only image files can be uploaded to a story';
  END IF;

  SELECT count(*) INTO photo_count
  FROM storage.objects o
  WHERE o.bucket_id = 'garden-photos'
    AND (storage.foldername(o.name))[1] = story_folder
    AND COALESCE(o.metadata->>'mimetype', '') LIKE 'image/%';

  IF photo_count >= 5 THEN
    RAISE EXCEPTION 'Creator accounts can upload up to five photos per story';
  END IF;

  RETURN new;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_creator_story_photo_quota() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_creator_story_photo_quota() TO postgres;
