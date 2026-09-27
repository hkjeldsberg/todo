# todo — implementation plan (from ../PRD.md §10)

## P1 Scaffold + design system
- [x] package.json (union of deps), next/ts/eslint/postcss/vitest config
- [x] design tokens + primitives ported from memo (globals.css, Modal, press, pills)
- [x] shell: bottom tab bar (mobile) / left rail (desktop), `todo` wordmark → Hoy
- [x] password gate (proxy.ts + auth.ts + login), Setup screen when env missing
- [x] verify: typecheck, lint, build, screenshots 390×844 + 1440×900

## P2 Database
- [x] 0001_todo_schema.sql (tested on local PG, idempotent)
- [x] 0002_copy_legacy.sql (tested with legacy migrations + seeds, counts match, idempotent)
- [x] content seeds (verbs) + scripts/verify-migration.mts
- [x] USER: ran 0001 + 0002, exposed `todo` — db:verify all ok (spanyard not API-readable, counted in SQL)
- [x] USER: ran 0003 + seed/verbs.sql (verified: 25 verbs, delete trigger works)

## P3 Frases + Ask   ## P4 Gramática + Diario
- [x] port memo board/chat/grammar/diary to schema `todo`, feature folders (user_id-aware upserts)
- [x] ↻ add phrase to Repaso (row + "add all" in Edit Scenario)

## P5 SRS + Repaso
- [x] leitner engine + kinds (word, phrase, conjugation, game_item) + tests
- [x] session runner, Cloze/Scramble/MC/Recall re-skinned, lexicon, conjugar (+Imperfecto)
- [x] verified against live DB: sessions, drill w/ Claude sentences, lexicon, answer flow

## P6 Games framework + ports (Laberinto, Diorama)
- [x] framework: registry, GameHost, useGameBridge (debounced progress), attempts → SRS, /juegos grid
- [x] tense port — 10 rooms played at 390×844 + 1440×900, 60 tests, DB content live
- [x] laberinto port — first island, wrong-door loop, gauntlet played at both sizes; 17 tests; DB content live
## P7 Dónde papercraft rebuild
- [x] 3D rebuild — isometric papercraft, 90° camera rotation, floor toggle, idle animation, find/place/pin/build; 15/15 tasks at both sizes; 64 tests
- [ ] USER: run supabase/seed/donde.sql (3 reworded task notes)
## P8 Hoy + polish
- [x] Hoy dashboard, grammar → games/drills links
- [x] brand focus ring; laberinto sign fonts not preloaded on every game
- [x] playtest data deleted (3 progress, 461 attempts, 56 game review items); user data intact (722 words, 7 scenarios, 50 phrases)
## P9 Deploy (vercel CLI)
- [ ] needs user go-ahead + Vercel team/project

## P10 El Cómic Dinámico (`/juegos/was`, port of ../../was)
Decisions (user, 2026-09-27): table in schema `todo` (not `was`), comic style throughout the game, `../../was` stays as reference, link from Gramática.
- [x] content: `src/content/was.json` (El Robo, text ids `robo_1..5`), zod shaping, art in `public/games/was/robo/` + sketch script
- [x] migration `0005_was.sql` (`todo.was_panels`, RLS, service_role, `todo.games` row) + `scripts/was-seed-sql.mjs` → `supabase/seed/was.sql`
- [x] `features/games/was/`: server.ts (Supabase → bundled fallback), review card (fill the blank, 4 verbs), progress (solved panels + pages)
- [x] Game.tsx: cover (rules + pages) → comic page; drag + tap-to-place, snap, color reveal, tooltip; recordAttempt per drop, saveProgress, restore solved panels
- [x] register: registry (skill past-tenses → Gramática links), GameHost, server-registry, package.json scripts
- [x] tests (content, server, review/progress) + `was:playtest` (390×844 + 1440×900)
- [x] verify: typecheck, lint, vitest, build, playtest; clean playtest rows if DB is written
- [ ] USER: run `supabase/migrations/0005_was.sql`, then `supabase/seed/was.sql` (bundled copy is used until then)

## Review
- Whole project: tsc clean, eslint clean, vitest 151/151, `next build` ok.
- Prod build: every route redirects to /login without a session, even with AUTH_DISABLED=1.
- Live DB: legacy copy verified (db:verify), phrase CRUD + review marks + phrase delete trigger, review sessions, conjugation drill with Claude sentences.
- Games verified by headless playtests only (SwiftShader), not on a real phone/GPU.
- P10 El Cómic Dinámico (2026-09-27): tsc/eslint clean, vitest 309/309 (21 new), `next build` ok.
  `was:playtest` 390×844 (tap-to-place) + 1440×900 (mouse drag): wrong verb → tooltip + back to bank, 5/5 → ¡Caso cerrado!,
  Otra vez resets, cover shows completed. Ran with Supabase env blanked, so nothing was written to the live DB.
  /juegos card + Gramática links (fue-estaba-estuve, pasado, preterito-cambia) clicked through. 0005 + seed tested on a
  throwaway local Postgres: idempotent, DB-only page survives re-seed, verb/type checks reject bad rows.
  Not verified: live DB content/progress/Repaso cards for `was` (needs 0005 applied), real phone.

## Cuentos — Spanyard Smart Reader (../PRD_STORY.md), 2026-09-27
- [x] migration 0006_cuentos.sql: todo.stories, todo.story_cards, srs kind 'story', cleanup trigger, games row
- [x] lib: zod story schema (nodes → sentences → tokens), cloze builder, integrity repair, prompt
- [x] generation: Claude (ANTHROPIC_MODEL) streamed + zodOutputFormat structured output → validate → insert
- [x] reader: narrative blocks + dialogue bubbles, tense toolbar (pretérito blue, imperfecto orange, subjuntivo green, reflexivos purple)
- [x] tooltips: lemma/tense/translation, reflexive grouping, subjunctive trigger highlight, Shift = sentence translation, tap on mobile
- [ ] save token → story_cards (code done; verify once 0006 is applied) + srs_items(kind story) → Repaso cloze card; saved badge
- [x] Repaso: 'story' kind in sessions, stats, filter chip
- [x] bundled sample story, 11 tests, 2 real generations (131 s / 113 s), reader playtest 16/16 at 390×844 + 1440×900
- [ ] USER: run 0006_cuentos.sql → then end-to-end: generate in the app, save a word, review it in Repaso
