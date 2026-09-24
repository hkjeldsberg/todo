# IN PROGRESS (MANUAL - USER)

# IN PROGRESS (CLAUDE)

# DONE
- Implemented PRD P1–P8 in `app/` (2026-09-24): shell + memo design system, Frases/Gramática/Diario ported to schema `todo`, unified Repaso (Leitner: words, phrases, conjugation incl. Imperfecto, game mistakes), Hoy, game framework, Diorama + Laberinto ports, Dónde 3D papercraft rebuild. tsc/eslint clean, 151 tests, build ok. Playtest data removed from DB.
- USER: ran 0003 + seed/verbs.sql. Verified: todo.verbs has 25 verbs; deleting a phrase now removes its Repaso card (2026-09-24)
- USER: ran 0001 + 0002 and exposed `todo`. Verified with `npm run db:verify`: memo, donde, ellabirinto, tense counts + spot checks match; spanyard copied (1000 words, 722 sentences, 732 review items), but its schema can't be read over the API so the script can't compare it (2026-09-24)
- Migration `app/supabase/migrations/0001_todo_schema.sql` creating schema `todo` (21 tables, RLS on, service_role only). Tested twice on local Postgres (2026-09-24)
- Migration `0002_copy_legacy.sql` (copies memo, spanyard, donde, ellabirinto, tense; tested locally with legacy schemas + seeds, counts match, idempotent)
- PRD approved by user (2026-09-24)
- Read IDEA.md and produce a PRD.md that you can later read and implement (2026-09-24)
  - Decisions: same Supabase project + schema `todo` (copy, old schemas kept), single-user password gate, keep comic 3D look for Diorama/Laberinto with memo chrome, unified SRS, games start fresh, name "todo", Vercel
- Supabase SQL editor: run `app/supabase/seed/donde.sql` (updates 3 Dónde task notes for the 3D version; same 15 tasks)
- Decide on deploy: which Vercel team/project for `todo` (I'll deploy with the Vercel CLI once you say go)
- Try the games on a real phone (only tested headless)
- P9 deploy, waiting on the go-ahead (progress: app/tasks/todo.md)