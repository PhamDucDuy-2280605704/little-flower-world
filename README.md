# Little Story World

A private writing and story-reading space. Writers create messages, letters, and illustrated multi-chapter books; Admin reviews each story before it can be shared.

Website: https://little-story-world.vercel.app/

## Main routes

| Route | Purpose |
| --- | --- |
| `/` | Main homepage and starting point |
| `/login` | Separate sign-in for writer accounts |
| `/studio` | Create and edit private drafts, add chapters and decorations, submit for review |
| `/guest` | Reader invitation portal |
| `/g/[slug]` | Public reader page for an approved and published story |
| `/gift` | Read stories saved to the signed-in account |
| `/admin` | Protected Admin center; requires the dedicated Admin account |
| `/studio?mode=admin` | Admin writing, review, and publishing workspace |
| `/little-story-backstage-7f4c` | Private Admin sign-in entry |

The Admin sign-in route is not linked from the homepage or public navigation and is marked `noindex`. The protected `/admin` route still checks the Admin account; knowing a URL does not grant access. The old `/admin/login` path redirects to the private sign-in entry.

## Language

A persistent **VI / EN** switch is available on every page. It remembers the selected language in the browser. The interface labels, forms, status messages, Admin workspace, guest portal, and reader controls switch language. Writer-authored story text is intentionally preserved as written rather than machine-translated.

## Writing, decoration, and review

- Every writer account can create multiple private stories.
- Story formats: message, letter, and multi-chapter book.
- Chapter count is **unlimited** for both writers and Admin.
- Writer accounts can add up to 5 photos per story (5 MB per photo) and choose up to 4 stickers.
- Admin has expanded photo and sticker management, full story reading preview, moderation, PIN, and publishing controls.
- Decorations are saved with each story: 3 color themes, 3 paper finishes, page-turn / soft-glow / sparkles / no-extra-motion effects, and a sticker collection.
- A story must be approved by Admin before it can be published. Writers can withdraw a pending review or edit a rejected story and resubmit it.

## Security model

Publishing, share links, PIN storage, guestbook moderation, story ownership, and private photo access are enforced by Supabase RLS, database triggers, and Storage policies, not only by hiding buttons in the client. Writer accounts are provisioned by Admin; public sign-up is not enabled.

## Technology

- Next.js App Router, React, and TypeScript
- CSS Modules and Tailwind CSS
- Motion for page-turn transitions and decorative effects
- Supabase Auth, Postgres RLS, Edge Functions, and private Storage
- Noto Sans and Noto Serif with Vietnamese glyph support

## Local development

1. Use a Node.js version compatible with `package.json`.
2. Install dependencies:

   ```bash
   npm ci
   ```

3. Create local environment variables:

   ```bash
   cp .env.example .env.local
   ```

4. Set the Supabase URL and Publishable Key:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
   ```

5. Run the app:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000).

## Quality checks

```bash
npm run lint
npm run typecheck
npm run build
```

## Data

- `gardens`: story drafts, publishing, approval, and decoration settings.
- `garden_chapters`: chapters for each story.
- `story_progress`: reading progress per account.
- `garden_guestbook`: reader notes and moderation state.
- `garden-photos`: private photo storage served using signed URLs.

Migration history and database guidance are in [`supabase/`](supabase/).

## Deployment

The `main` branch is connected to Vercel. Pushes to `main` run CI checks and trigger production deployment.
