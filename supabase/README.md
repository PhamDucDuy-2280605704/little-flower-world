# Personalized gardens

Each authenticated account owns at most one garden. Garden content is stored in Supabase instead of using the shared `sampleGarden` and `sampleStory` data at runtime.

## Inspect the existing progress table first

Before changing the database, run the read-only queries in [check-existing-schema.sql](check-existing-schema.sql) from Supabase SQL Editor and review the `story_progress` column types, duplicate pairs, existing indexes, RLS status, and policies. The query does not modify data. Keep its results so the current table state is known before migration.

## Apply the database migration

1. Open Supabase Dashboard for the Little Flower World project.
2. Open **SQL Editor** and create a new query.
3. Copy and run `migrations/20261107000000_personalized_gardens.sql`.
4. The migration checks that the existing `story_progress.user_id` is `uuid`, `chapter_id` is `text`, and there are no duplicate `(user_id, chapter_id)` pairs before creating the unique index. If that check fails, stop and inspect the existing table; do not change its columns blindly.
5. In **Table Editor**, verify the tables `gardens`, `garden_chapters`, `garden_items`, and `story_progress`, and inspect the RLS policies.

The migration makes garden content read-only to authenticated visitors. The project owner creates and edits garden content from the Supabase Dashboard / SQL Editor. It does not put a service-role key in the website.

## Create a garden for an invited account

1. Create the Auth user in **Authentication > Users**. Public sign-up should remain disabled.
2. Copy that user's **User UID**.
3. Open `examples/create_personal_garden.sql` and replace the placeholder `target_user_id`.
4. Customize the garden name, introduction, chapter titles/text, flower types/colors/positions, and final letter.
5. Run the SQL template once for that user. The unique constraint on `gardens.owner_id` prevents assigning a second garden to the same account.

Every row in `garden_chapters` is a story chapter. A row in `garden_items` with the matching `chapter_id` is the flower that opens it. Decorative flowers have a NULL `chapter_id`. Chapter IDs are derived from the new garden UUID, so a new personalized story does not accidentally inherit read markers from the old shared sample story. Keep those IDs unchanged when editing an existing garden. Paragraphs and letter text are JSON arrays of strings.

## Data isolation

- `gardens.owner_id` identifies the Supabase Auth account that owns the garden.
- RLS lets that account select only its garden, flowers, and chapters.
- Visitors cannot insert, update, or delete garden content through the public client.
- `story_progress` remains keyed by `(user_id, chapter_id)`; its policies only allow a user to access progress for chapters in that user's garden.
- The browser continues to use only the Supabase Publishable Key. Never add a Secret / Service Role key to `.env`, client code, or GitHub.

## First verification after migration

Use two invited test accounts with two different garden records.

1. Sign in as account A and confirm only A's garden and chapters load.
2. Read a chapter, refresh the page, and confirm its read marker remains.
3. Sign out, then sign in as account B and confirm B sees different flowers and story content.
4. While signed in as B, try selecting A's garden by its UUID in the Supabase client/API; it should return no rows.
5. Try inserting/updating garden content as a normal authenticated user; the request should be denied.
6. Confirm account A's progress is unchanged after testing account B.

Do not consider RLS verified until these checks have been run against the actual Supabase project.
