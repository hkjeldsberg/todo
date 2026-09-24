# todo

Spanish, all in one ("todo" = everything): the five learning apps — memo, Spanyard,
Dónde, El Laberinto and The Memory Diorama — combined into one Next.js app.
Spec: `../PRD.md`. Progress: `tasks/todo.md`.

Next.js 16 (App Router) · React 19 · Tailwind v4 · Supabase (schema `todo`) ·
Claude · React Three Fiber for the games. Visual system: memo's **Sticker Tabs**
(`../memo/DESIGN.md`) everywhere.

## Sections

| Route | What |
|---|---|
| `/` Hoy | Today: review due, diary, continue a game, a grammar topic |
| `/frases` | Phrase board (scenarios → categories → phrases), `?` Ask Claude, `*` suggest, `↻` add to Repaso |
| `/gramatica` | Grammar topics (content in code) + "Practise it" links to games/drills |
| `/diario` | Diary calendar, 5 sentences/day with Claude feedback |
| `/juegos` | Game grid → `/juegos/<slug>` full screen |
| `/repaso` | Unified Leitner review: `/repaso/sesion`, `/repaso/conjugar`, `/repaso/lexico` |

## Setup

1. Supabase SQL editor, in order: `supabase/migrations/0001_todo_schema.sql`,
   `0002_copy_legacy.sql` (copies the old apps' data; ends with a row-count table),
   `0003_phrase_review_cleanup.sql`, then `supabase/seed/*.sql` (verbs + game content).
2. Settings → API → Exposed schemas: add `todo`.
3. `.env.local` from `.env.example`.
4. `npm run dev` → http://localhost:3000. `npm run db:verify` compares legacy vs `todo` rows.

## Structure

```
src/app/(shell)/…     section pages (nav bar / rail)     src/app/juegos/[slug]  full-screen game host
src/app/repaso/…      full-screen review sessions        src/proxy.ts           password gate
src/design/           nav, PageHeader, Modal, Setup, Login
src/lib/              db (schema todo, service role), auth, session, user (OWNER id), errors
src/features/phrases  memo board, chat, AI suggest, review marks
src/features/grammar  topics, progress, practice links
src/features/diary    calendar, notes, sentences, feedback
src/features/srs      Leitner engine, session builder, verbs, card views, lexicon
src/features/games    registry, host, progress/attempt actions, one folder per game
src/content/          bundled content (verbs, game curricula) — fallback + seed source
```

## Extending

- **Game**: `src/features/games/<slug>/Game.tsx` (client root, `GameProps`) and
  `server.ts` (`loadContent`, `toReviewCard`), then one entry each in `registry.ts`,
  `GameHost.tsx`, `server-registry.ts`. Wrong answers reported via `recordAttempt`
  show up in Repaso automatically.
- **Review kind**: add to `ReviewKind` + the DB check, build its cards in `srs/session.ts`.
- **Section**: a folder in `features/`, a route in `app/(shell)/`, one entry in `design/nav.ts`.

## Auth

One password (`APP_PASSWORD`), HMAC cookie signed with `AUTH_SECRET` (from memo).
Every Server Action calls `requireSession()`. `AUTH_DISABLED=1` skips the gate under
`next dev` only (headless playtests). All tables have `user_id` (one owner for now).

## Commands

```
npm run dev | build | lint | typecheck | test
npm run db:seed-sql   # verbs.json → supabase/seed/verbs.sql
npm run db:verify     # legacy vs todo row counts + spot checks
npm run <game>:seed   # src/content/<game>.json → supabase/seed/<game>.sql  (game = donde | tense | laberinto)
npm run <game>:playtest  # headless play-through; needs a dev server with AUTH_DISABLED=1
```

Playtests write real progress/attempts to the database; clear `todo.game_progress`,
`todo.game_attempts` and `todo.srs_items where kind = 'game_item'` afterwards.
