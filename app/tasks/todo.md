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

## Review
- Whole project: tsc clean, eslint clean, vitest 151/151, `next build` ok.
- Prod build: every route redirects to /login without a session, even with AUTH_DISABLED=1.
- Live DB: legacy copy verified (db:verify), phrase CRUD + review marks + phrase delete trigger, review sessions, conjugation drill with Claude sentences.
- Games verified by headless playtests only (SwiftShader), not on a real phone/GPU.
