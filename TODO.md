# IN PROGRESS (MANUAL - USER)
- Supabase SQL editor: run `app/supabase/migrations/0008_pasado.sql`, then `app/supabase/seed/verbs.sql` (adds dar + ver), then `app/supabase/seed/pasado.sql` (El Candado del Tiempo; drills fall back to the bundled copy, but Leitner progress is only saved once 0008 is in)

# IN PROGRESS (CLAUDE)

# DONE
- El Candado del Tiempo (`/juegos/pasado`, PRD_PAST.md) (2026-09-30): Tense Lock cloze (lock pretérito/imperfecto, then type; accent keys), Syntax Scrambler word blocks from box 4, per-verb Leitner (5 boxes, 1/3/7/14/30 days, miss → box 1 + re-asked in session), Irregular Matrix drawer (bottom sheet / right slide-over, amber roots), 88 drills over 22 verbs, misses → Repaso. Reuses existing `todo.verbs` (PRD's uuid table would clash); new `todo.past_drills` + `todo.past_progress`. tsc/eslint clean, 1063 tests, build ok, playtest 390×844 + 1440×900.
- El Laberinto del Gnomo updates (2026-09-30): suggestions always listed under the input (per dungeon, no toggle; typed 15 / from suggestion 5), LatAm voice default, rotation removed (one fixed view), map redrawn as original 16-bit top-down pixel art in the style of img/gnomo_style.png (2D canvas, pixel gnome with walk cycle and all hiding poses). 1038 tests, build ok, playtest all 4 dungeons at 390×844 + 1440×900.
- El Laberinto del Gnomo (`/juegos/posiciones`, PRD_PLACEMENT.md) (2026-09-29): 4 top-down dungeons (Jardín A1, Mercado A2, Cementerio A2, Laberinto B1, 27 hiding spots), offline parser + grid relation engine (left/right/front/behind follow the camera), "Mostrar sugerencias" toggle (free, 5 vs 15 pts), hold-to-talk voice (es-ES / es-419), Claude Haiku fallback parser, 83-expression album (65 reachable in these rooms), missed/wrong positions → Repaso. Played all 4 dungeons at 390×844 + 1440×900; whole app: tsc/eslint clean, 1032 tests, build ok.
- El Cómic Dinámico (`/juegos/was`, port of ../was, PRD in ../was/PRD.md) (2026-09-27): comic look kept, table `todo.was_panels`, wrong drops → Repaso fill-the-blank cards, progress saved, linked from Gramática. tsc/eslint clean, 309 tests, build ok, playtest ok at 390×844 + 1440×900.
- El Rayo Modificador (`/juegos/opuestos`, PRD_OPPOSITES.md) (2026-09-24): 3D Rapier physics sandbox, 15 opposite pairs (incl. abrir/cerrar, encender/apagar, subir/bajar), 11 levels with multiple solutions, radial word menu, wrong words → Repaso "¿Cuál es el contrario de…?" cards. All 11 levels won at 390×844 + 1440×900; whole app: tsc/eslint clean, 288 tests, build ok.
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
- Supabase SQL editor: run `app/supabase/migrations/0004_opuestos.sql`, then `app/supabase/seed/opuestos.sql` (El Rayo Modificador words + levels; the game uses its bundled copy until then)
- Supabase SQL editor: run `app/supabase/migrations/0005_was.sql`, then `app/supabase/seed/was.sql` (El Cómic Dinámico panels; the game uses its bundled copy until then)
- Read PRD_STORY.md and implement as a game in the todo app. Use claude ai as AI model (since we also have credentials for this)
  - [x] built as `/juegos/cuentos` (reader, Claude generation, tense toolbar, hover/tap cards, save to Repaso); tsc/eslint clean, 320 tests, build ok, reader playtest ok
  - [x] end-to-end check after 0006 is applied
- Supabase SQL editor: run `app/supabase/migrations/0006_cuentos.sql` (stories, saved words, new Repaso card type). Tell Claude when done → it verifies generate → save → Repaso end to end
- Supabase SQL editor: run `app/supabase/migrations/0007_posiciones.sql`, then `app/supabase/seed/posiciones.sql` (El Laberinto del Gnomo; the game uses its bundled copy until then)
- Try El Laberinto del Gnomo on a real phone: the mic (Web Speech) and the on-screen keyboard couldn't be tested headless