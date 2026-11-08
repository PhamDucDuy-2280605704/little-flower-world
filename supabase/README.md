# Little Story World · Supabase

Supabase stores writer accounts, private story drafts, chapters, decorations, reader progress, guestbook messages, and private photos.

## Writer accounts

Writer accounts are provisioned by Admin; public sign-up is disabled.

1. Open **Supabase Dashboard → Authentication → Users**.
2. Create the writer account and share its credentials using a secure channel.
3. Never share a Service Role Key or Admin credentials with writers.

Each writer may create multiple stories. A story is stored in `public.gardens`, with its chapters in `public.garden_chapters` and private photos in the `garden-photos` bucket.

## Writing and moderation workflow

| Status | Writer | Admin |
| --- | --- | --- |
| `draft` | Create, edit, preview, and save privately | View and manage |
| `pending` | Content is locked; may withdraw the review request | Review, approve, or reject |
| `approved` | Read-only; cannot publish | Configure PIN and publish |
| `rejected` | Edit and resubmit | Review, edit, or delete |

**Chapter count is unlimited** for writer and Admin accounts. The former chapter-limit trigger and function were removed from production. Writer accounts may upload up to **5 photos per story** (up to 5 MB each) and choose up to **4 stickers** in the editor. Admin retains expanded photo and sticker management.

A story's decoration settings are saved in `gardens.experience_settings.storyDecorations`:
- `theme`: meadow, sunset, or starlight
- `paper`: ivory, linen, or rose
- `effect`: page-turn, soft-glow, sparkles, or none
- `stickers`: selected sticker IDs

## Database-enforced controls

- New writer stories are forced to `draft`, unpublished, without a share slug.
- Only Admin may approve/reject, publish/unpublish, manage PIN secrets, or moderate guestbook messages.
- Writers can only access their own stories.
- Stories awaiting review cannot be edited by their writer.
- Editing an approved story removes its public share state and requires a fresh review.
- Chapter inserts are owner-scoped but have no chapter-count limit.
- Writer photo upload quotas are enforced by Storage trigger and RLS; photo quota function execution is revoked from `anon` and `authenticated`.

## Production migrations

The story-authoring migrations already applied to production and committed in this repository are:

1. `20261108064414_guest_story_authoring_and_admin_approval.sql`
2. `20261108065344_tighten_creator_review_and_media_controls.sql`
3. `20261108065415_allow_rejected_story_resubmission.sql`
4. `20261108065433_guard_creator_story_cover_and_resubmission.sql`
5. `20261108070427_restrict_creator_photo_quota_trigger_function.sql`
6. `20261108141000_allow_unlimited_story_chapters.sql`

Do not edit migration files that have already been applied. Add a new timestamped migration for future schema changes.

## Suggested access checks

Use one test writer account and the separate Admin account:

1. Writer creates a story. Confirm `approval_status = 'draft'`, `is_published = false`, and `share_slug IS NULL`.
2. Writer adds many chapters. Confirm there is no database chapter-count ceiling.
3. Writer submits for review. Confirm status becomes `pending` and the content is locked until the request is withdrawn or Admin processes it.
4. Admin approves and publishes; test PIN protection. Rejecting a published story must remove its public share state.
5. Writer cannot read `garden_share_secrets` or moderation data in `garden_guestbook`, and cannot publish directly.
6. A second writer cannot read or modify the first writer's stories.

Run destructive tests only inside a transaction that is rolled back.

## Security

- The browser uses only the Supabase Publishable Key.
- Never commit a Secret/Service Role Key or expose it through a `NEXT_PUBLIC_*` variable.
- The definer-rights photo quota function is callable only by PostgreSQL through its trigger; direct `EXECUTE` has been revoked from `anon` and `authenticated`.
- Enable **Leaked Password Protection** in Supabase Auth to block compromised passwords.
