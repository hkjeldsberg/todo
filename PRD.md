# PRD — todo

> *todo* (Spanish): "everything / all". One app that combines five Spanish-learning apps:
> **memo**, **Spanyard**, **Dónde**, **El Laberinto** (`ellaberinto/`) and **The Memory Diorama** (`tense/`).

Written 2026-09-24 from `IDEA.md`. This is the implementation spec; `tasks/todo.md` tracks progress.

---

## 0. Decisions (confirmed with user)

| Topic | Decision |
|---|---|
| App name | **todo** |
| Location | `todo/app/` (new Next.js project; the five old folders stay untouched as reference) |
| Database | Same Supabase project as the old apps (ref `yeje…`), new schema **`todo`**. Data is **copied** from `memo`, `spanyard`, `donde`, `ellabirinto`, `tense`; old schemas are left intact as backup. |
| Auth | Single user, memo's password gate (`APP_PASSWORD` + HMAC cookie). Every user-data table still carries a `user_id`, so real accounts can be added later. |
| Game progress | Start fresh. Old localStorage progress (Dónde, Laberinto, Diorama) is **not** migrated. New progress lives in the DB. Spanyard's Leitner boxes **are** migrated (they're in the DB). |
| General style | memo's **Sticker Tabs** design system (`memo/DESIGN.md`) for the whole app. |
| Dónde style | Rebuilt as a 3D isometric **papercraft diorama** matching `img/donde_new_style.png`, with animated objects and camera rotation. |
| Diorama / Laberinto style | Keep their comic cel-shaded 3D look. HUD, menus and feedback use memo chrome. The 3D palette is tinted toward memo colours (ink `#3D2140` outlines instead of pure black, pink accent for highlights). |
| Training | **One unified spaced-repetition (Leitner) engine**: 1000 words, saved phrases, conjugations, and mistakes made in any game. |
| Deploy | Vercel, as a new project. Old apps stay live until the user retires them. |
| Git | **No git commands** (project CLAUDE.md). Deploy with the Vercel CLI (`vercel deploy`), not a git integration. |

---

## 1. What exists today (source inventory)

| App | What it has | Data |
|---|---|---|
| **memo** | Phrase board (scenarios → categories → phrases, dnd reorder, AI suggest, Ask-Claude chat), grammar reference (~47 topics in `src/lib/grammar.ts`, done-toggle), diary (calendar, notes, tags, 5 Spanish sentences/day + Claude feedback), password gate | `memo.scenarios`, `categories`, `phrases`, `grammar_progress`, `diary_days`, `diary_notes`, `diary_sentences` |
| **Spanyard** | 1000 most-common words, Leitner SRS (5 boxes), Cloze + Scramble modes, JIT Claude sentences, Lexicon grid, Conjugation drill (Presente/Pretérito/Perfecto/Futuro, 25 verbs in `lib/conjugation.ts`) | `spanyard.words`, `user_words`, `sentences` |
| **Dónde** | Location-phrases scrapbook: 3 pages / 15 tasks, mechanics `drag`/`flap`/`pick`/`pin`/`build`, grammar linter (hay+definite, del/al, agreement), judge, vitest suite | `donde.pages`, `donde.tasks`, `content/scrapbook.json`; progress in localStorage |
| **El Laberinto** | First-person R3F maze, preterite vs imperfect, 7 islands / 24 rooms, 3 doors per room, portals, XIII cel-shade + ink outlines, El Hierro time-trial, touch controls | `ellabirinto.nodes`, `src/data/nodes.json`; progress in localStorage |
| **Diorama (tense)** | Isometric R3F rooms, preterite vs imperfect, 10 rooms, imperfect = loop anim, preterite = one-off anim, playtest script | `tense.rooms`, `tense.puzzles`, `content/rooms.json`; progress in localStorage |

All five use Next 16 + React 19 + TS + Tailwind 4 + supabase-js. The 3D ones use R3F 9 / drei 10 / three 0.186 / postprocessing.

---

## 2. Information architecture (suggested)

Five sections plus a home screen. Nav labels are Spanish (a bit of immersion). All other UI text is English, and learning content is Spanish.

```
/                    Hoy        — today: reviews due, today's diary entry, continue last game, a grammar card
/frases              Frases     — memo phrase board (scenarios tabs, categories, phrases)
/frases/ask          Ask Claude — phrase-hunting chat (from memo)
/gramatica           Gramática  — topic grid (levels 1/2/3 + Spoken)
/gramatica/[slug]    topic page + done toggle
/diario              Diario     — calendar month
/diario/[day]        notes, tags, 5 sentences, Claude feedback
/juegos              Juegos     — game cards from the game registry
/juegos/[slug]       full-screen game (donde, laberinto, tense, …future)
/repaso              Repaso     — training hub: daily mixed session + focused drills
/repaso/sesion       SRS session runner (mixed or filtered by kind)
/repaso/conjugar     conjugation drill (past + future focus, from Spanyard)
/repaso/lexico       lexicon grid (1000 words by box) + search
/login
```

### Navigation
- **Mobile (<1024px):** a sticker-style bottom tab bar with 5 items: Frases · Gramática · Diario · Juegos · Repaso. Tap the `todo` wordmark (top-left) to go to **Hoy**. On `/frases`, memo's split footer pill (`?` · `+ New Phrase` · `*`) floats directly above the tab bar.
- **Desktop (≥1024px):** a left rail with the same items and the content column centred (memo caps it at 520px; the reading pages Gramática and Diario may widen to 720px).
- **Games** are full-screen. The nav is hidden, and there's a sticker `✕`/back chip top-left plus a pause menu.

### Hoy (home), a suggestion
A stack of sticker cards:
1. **Repaso**: "12 due · 5 new". The primary pill starts the mixed session.
2. **Diario**: today's entry state (0/5 sentences). Tap to open today.
3. **Continúa**: last played game plus its progress.
4. **Gramática**: a random not-yet-done topic.

The first card uses the accent (pink) tone, following memo's convention.

---

## 3. Architecture

### 3.1 Stack
Next.js 16 (App Router, `src/`), React 19, TypeScript strict, Tailwind v4, Framer Motion, dnd-kit, zod, supabase-js, `@anthropic-ai/sdk`, React Three Fiber + drei + postprocessing + three, vitest, playwright-core (playtests). Font: Baloo 2 (next/font). AI model: `ANTHROPIC_MODEL`, default `claude-sonnet-5`.

### 3.2 Folder layout (feature modules)
```
app/
  src/
    app/                      routes only (thin: load data, render feature component)
      (shell)/                routes that show nav: page.tsx (Hoy), frases/, gramatica/, diario/, repaso/, juegos/page.tsx
      juegos/[slug]/          full-screen game route (no nav)
      login/
      api/                    only where Server Actions don't fit (none expected)
    proxy.ts                  password gate (Next 16 name for middleware)
    design/                   tokens.css + primitives: StickerCard, Pill, Chip, TabBar, Modal, PressButton, CountPill
    lib/
      db.ts                   server-only supabase client, .schema('todo'), service role
      auth.ts, session.ts     HMAC cookie (ported from memo), requireSession()
      ai/                     one Claude client + prompts: suggestPhrase, chat, diaryFeedback, sentenceForWord, sentenceForConjugation
      user.ts                 currentUserId() → constant OWNER id for now
    features/
      phrases/                memo board (store, AppShell, CategoryCard, dialogs, ChatView…)
      grammar/                grammar.ts content + grid + topic page
      diary/
      srs/                    Leitner engine, session builder, card renderers, lexicon
        kinds/                word.ts, phrase.ts, conjugation.ts, game-item.ts  (one file per ReviewKind)
      games/
        registry.ts           GAME_REGISTRY: GameManifest[]
        progress.ts           generic save/load of game_progress, recordAttempt()
        donde/                game module (scene, content schema, judge, grammar lint, layouts)
        laberinto/
        tense/
    content/                  bundled JSON seeds (fallback + seed-SQL source): donde.json, laberinto.json, tense.json, verbs.json, words.json
  supabase/
    migrations/               0001_todo_schema.sql, 0002_copy_legacy.sql, …
    seed/                     generated seed SQL for game content
  scripts/                    seed-sql generators, verify-migration.ts, playtest.ts
  tests/
```

### 3.3 Extensibility contracts

**Adding a game** means adding a folder under `features/games/<slug>/`, a manifest entry, a content table or JSON, and nothing else:

```ts
type GameManifest = {
  slug: string;                       // 'donde'
  title: string; blurb: string;
  skills: SkillTag[];                 // 'location', 'past-tenses', 'vocab', 'future'…
  level: 'A1' | 'A2' | 'B1' | 'B2';
  cover: CoverSpec;                   // sticker card art (CSS/SVG, no emoji)
  load: () => Promise<{ default: React.ComponentType<GameProps> }>; // dynamic import, ssr:false
  loadContent: () => Promise<unknown>;                              // server-side, zod-validated
  toReviewCard?: (ref: string, content: unknown) => ReviewCard;    // lets mistakes enter SRS
};
type GameProps = {
  content: unknown;
  progress: GameProgress | null;
  onProgress(p: GameProgress): void;                  // debounced upsert to todo.game_progress
  onAttempt(a: { itemRef: string; correct: boolean; answer?: string }): void; // → game_attempts + SRS
  onExit(): void;
};
```

**Adding a review kind** means adding a file in `features/srs/kinds/` that implements `{ kind, buildCard(item), grade(item, answer) }` and registering it. The session builder is kind-agnostic.

**Adding a feature/page** means adding a folder in `features/`, a route in `app/(shell)/`, and one nav entry in `design/nav.ts`.

### 3.4 Data flow
- Reads happen server-side in route `page.tsx` through `lib/db.ts` (service role, never exposed to the client).
- Writes go through Server Actions, each calling `requireSession()` first (memo pattern).
- memo's optimistic store and localStorage snapshot are kept for the phrase board. Other features use plain server actions with `revalidatePath`.
- Game content loads server-side and is handed to the dynamically imported client game. If the DB is unreachable, the bundled JSON is the fallback (same zod schema). A small "content: supabase/bundled" badge shows only in dev.

---

## 4. Database — schema `todo`

The schema is exposed via the Data API, but RLS is **enabled with no anon policies**, so only the service role (server) can read or write. That's safer than the old apps, which gave anon read access.

### 4.1 Core
```sql
todo.users (id uuid pk, name text, created_at)          -- one row seeded: OWNER (fixed uuid in lib/user.ts)
```
Every user-data table below has `user_id uuid not null references todo.users(id) default '<OWNER>'`. Content tables have no user_id.

### 4.2 Phrases (from memo)
```
todo.scenarios   (id uuid pk, user_id, name, sort_order, created_at)
todo.categories  (id uuid pk, user_id, scenario_id → scenarios cascade, name, sort_order, created_at)
todo.phrases     (id uuid pk, user_id, scenario_id → scenarios cascade, category_id → categories set null,
                  spanish_text, translation_text, sort_order, created_at)
```

### 4.3 Grammar + diary (from memo)
```
todo.grammar_progress (user_id, slug, done_at, pk(user_id, slug))
todo.diary_days       (user_id, day date, tags text[], updated_at, pk(user_id, day))
todo.diary_notes      (id, user_id, day, body, sort_order, created_at)
todo.diary_sentences  (id, user_id, day, position 0..4, spanish, english, feedback, feedback_at, created_at,
                       unique(user_id, day, position))
```
Grammar topics stay in code (`features/grammar/grammar.ts`), as in memo, because they're authored content.

### 4.4 Vocabulary + verbs (from Spanyard)
```
todo.words          (id int pk  -- keep Spanyard ids, rank unique, spanish, english, pos)
todo.word_sentences (id, word_id → words, spanish, english, cloze, created_at)   -- JIT cache; many per word allowed
todo.verbs          (infinitive pk, english, is_irregular, forms jsonb)          -- seeded from Spanyard lib/conjugation.ts
```
Add **Imperfecto** to `verbs.forms` (Spanyard has Presente/Pretérito/Perfecto/Futuro) so the conjugation drill covers the past tenses the games teach. Every added form must be double-checked, following Spanish-correctness rules.

### 4.5 Unified SRS
```
todo.srs_items (
  id uuid pk, user_id,
  kind text check (kind in ('word','phrase','conjugation','game_item')),
  ref  text not null,          -- word:<id> | phrase:<uuid> | conj:<infinitive>:<tense>:<pronoun> | game:<slug>:<item_id>
  source text not null,        -- 'spanyard' | 'phrases' | 'conjugar' | 'game:tense' …
  box int not null default 1 check (box between 1 and 5),
  next_review_at timestamptz not null default now(),
  last_reviewed_at timestamptz, reps int default 0, lapses int default 0,
  suspended bool default false, created_at,
  unique (user_id, kind, ref)
)
todo.srs_reviews (id, user_id, item_id → srs_items cascade, correct bool, mode text, answer text, reviewed_at)
```
Leitner rules come from Spanyard: box intervals 1/3/7/14/30 days, correct means box+1 (max 5), wrong resets to box 1. Session defaults reuse Spanyard's constants (new per session, max review, reinforcement).

What enters the SRS:
- **Words:** new words from rank order (Spanyard behaviour).
- **Phrases:** opt-in per phrase (`↻` "add to Repaso" in the phrase row menu) plus a per-scenario "add all" option.
- **Conjugation:** items are created the first time a form is drilled.
- **Game items:** every wrong answer in a game upserts `game:<slug>:<item_id>` at box 1, reviewed as a text card through the game's `toReviewCard`:
  - tense puzzle → cloze with its options,
  - laberinto node → prompt + 3 door options,
  - donde task → the prompt, with the options being `zone_notes` candidates, or a hay/está build.

### 4.6 Games
```
todo.games          (slug pk, title, sort, enabled bool)   -- which registry games are visible, and their order
todo.game_progress  (user_id, game_slug, state jsonb, updated_at, pk(user_id, game_slug))
todo.game_attempts  (id, user_id, game_slug, item_ref, correct, answer, created_at)

-- content, one prefix per game (copied 1:1 from the old schemas, same columns and constraints)
todo.donde_pages, todo.donde_tasks          -- from donde.pages / donde.tasks
todo.laberinto_nodes                        -- from ellabirinto.nodes
todo.tense_rooms, todo.tense_puzzles        -- from tense.rooms / tense.puzzles
```
`donde_pages.visual_layer` gets its check constraint widened when the new 3D scenes land (see §6).

### 4.7 Migration of data (`0002_copy_legacy.sql`)
- This is plain `insert … select` from the old schemas in the same project. It is idempotent (`on conflict do nothing`), and old ids are preserved (uuid and word ids) so references stay valid.
- `spanyard.user_words` → `todo.srs_items` (`kind='word'`, `ref='word:'||word_id`, same box/next_review_at/last_reviewed_at, `source='spanyard'`).
- `spanyard.sentences` → `todo.word_sentences`.
- Verbs come from Spanyard's code, not the DB, so they're seeded from `content/verbs.json`.
- After copying, `scripts/verify-migration.ts` compares row counts for every source→target pair and spot-checks 5 random rows each. The migration is not done until it prints all green.

---

## 5. Design system (memo → everything)

- Port `memo/src/app/globals.css` tokens and `memo/DESIGN.md` rules into `src/design/tokens.css` unchanged:
  - `--shell #FFE9B8`, `--page #FFF3D6`, `--card #FFFFFF`, `--accent #FF5FA2`, `--ink #3D2140`, …
  - Baloo 2 500/700
  - hard offset shadows with no blur
  - the `.press` translate-by-shadow motion
  - no emoji in chrome, and text glyphs `? * ▾ ▸ ✎ ✕ ⠿` only
  - `@layer base` cascade note
  - `prefers-reduced-motion`
- Build primitives once in `src/design/` and use them everywhere: StickerCard (light/accent/flat tone, alternating tilt), Pill, Chip, CountPill, TabBar, Modal, PressButton, SegmentedPill.
- **Spanyard screens are fully re-skinned.** They drop the Bloque design and terracotta. Cloze input, scramble chips, drop-indicator bar (pink), Leitner bar and lexicon grid (box colours = a 5-step ramp from `--pill-flat` to `--accent`) all move to memo tokens.
- **Game HUDs** (prompts, options, feedback bubbles, pause menu, level select, results) are sticker cards and pills over the canvas. Diegetic in-world text can keep its own hand-lettered look.
- **Diorama/Laberinto 3D:** keep toon shading, ink outlines and halftone, with these changes:
  - outline colour becomes `--ink`
  - highlight/selection colour becomes `--accent`
  - background/fog becomes `--shell`/`--page`
  - island/biome palettes stay, but are desaturated slightly toward warm
- **Mobile first:** every screen works at 360×640 portrait and 1440×900 desktop, respects safe areas, uses 16px inputs (no iOS zoom), and has tap targets ≥44px.

---

## 6. Games

Common to all games:
- Full-screen route and dynamically imported bundle (keeps three.js out of other pages).
- DPR capped `[1, 2]`, with drei `PerformanceMonitor` lowering DPR/effects on weak GPUs.
- The canvas pauses when the tab is hidden.
- Pointer events only (unifies mouse and touch). Every drag has a tap/keyboard alternative.
- Portrait and landscape both supported. Controls never overlap the prompt card.
- Progress goes to `todo.game_progress`; every answer goes to `onAttempt` (so wrong answers feed SRS).

### 6.1 Dónde — isometric papercraft rebuild (biggest piece of work)
Target look is `img/donde_new_style.png`, "nostalgic papercraft scrapbook":
- **Cutaway diorama:** floor plus two back walls with visible **corrugated-cardboard edges**, sitting on a kraft-paper craft table with polaroids and sketches scattered around it.
- **Paper materials:** cardstock, kraft, tile-grid paper, fabric-look paper for sofa/curtains. Textures are painted at runtime on canvas, as today's `art.ts` does (no image assets needed); add paper grain and slightly irregular cut edges.
- **Lighting:** soft warm key light from the window, gentle ambient, soft contact shadows (drei `ContactShadows` / baked AO). This replaces today's flat `MeshBasicMaterial`, because the reference has soft shadows. Film grain stays.
- **Objects:** built procedurally from rounded boxes, cylinders and extruded shapes (sofa, cushions, table, chair, plant, mug, lamp, box, bed, shelves, cat). A GLTF loader path is kept for future assets.
- **Animated/moving objects (idle life):** curtains sway, plant leaves bob, mug steam, cat walks between hiding spots and its tail flicks, ceiling fan, paper sheets flutter, pages of the book flip between scenes. Objects that are task targets have a subtle "breathing" lift.
- **Camera:**
  - orthographic isometric
  - **rotate in 90° steps** (⟲ ⟳ chips plus a horizontal swipe/drag on empty space), smooth-tweened
  - pinch/wheel zoom within limits
  - one-finger pan when zoomed
  - the wall nearest the camera auto-cuts away/fades as the view rotates, so objects behind it are visible
  - a floor toggle ("arriba/abajo") for the two-storey apartment
- **Mechanics** (current curriculum kept):
  - **find:** read the prompt, rotate/zoom to locate the object, tap it (replaces `pick` / `flap`: lifting a sofa cushion or tablecloth reveals what's under it)
  - **place:** drag the object in 3D; raycast onto surfaces; drop zones highlight in pink; snap with a tape-slap animation; a wrong zone snaps back with the red sticky note
  - **pin:** on the map scene, push-pins go onto a tabletop street diorama (buildings as folded-paper blocks, taxis moving along streets)
  - **build:** Dymo sentence builder in the HUD, with hay/está rejection
- **Scenes:**
  1. Apartment: two floors, living room plus girl's bedroom
  2. Plaza: café terrace, fountain, kiosk, benches, pigeons walking
  3. Botánico: paper city blocks, park, pharmacy, traffic
- **Reuse from old Dónde:** `content/schema.ts`, `lib/grammar.ts`, `lib/judge.ts`, `scrapbook.json`, and the tests. The render layer (`layouts.ts`, `SceneView`, `Stage`) is rewritten in 3D coordinates. The **curriculum↔scene contract test** (every `draggable_id`/`target_zone` exists in the 3D layout) is kept.
- `SurfaceHtml`, not drei `<Html>` (known crash, see `donde/CLAUDE.md`).

### 6.2 El Laberinto (from `ellaberinto/`)
Port as-is into `features/games/laberinto/`, with these changes:
- memo-chrome HUD
- palette tint as in §5
- progress to DB
- wrong doors feed the SRS
- mobile: the existing touch controls get checked on a real phone viewport (virtual joystick left, look-drag right, tap door to walk to it as a shortcut)

### 6.3 Memory Diorama (from `tense/`)
Port as-is into `features/games/tense/`, with these changes:
- memo-chrome HUD
- palette tint
- progress to DB
- wrong answers feed the SRS

The `playtest` script is ported and pointed at the new route.

### 6.4 Future games (not in scope, but the architecture must allow them)
Candidates that show the registry works: *Subjuntivo* door game reusing the Laberinto engine with new content; a *Futuro* game; a listening game.

---

## 7. Repaso (training)

- **Daily session** (`/repaso/sesion`): due items across all kinds, ordered by overdue-ness, plus N new words. Up to 20 cards by default (configurable).
- **Card renderers by kind:**
  - `word`: Cloze (type, with Hint toggle) or Scramble (tap and drag chips, reorder, drop indicator). Uses a JIT Claude sentence, cached in `word_sentences`, reusing the cached one if present.
  - `phrase`: show Spanish, recall English (self-grade ✓/✕), or the reverse; long phrases use Scramble.
  - `conjugation`: 4-option multiple choice (same-tense + same-pronoun distractors). Shows the full tense table on check. Tenses: Presente, Pretérito, **Imperfecto**, Perfecto, Futuro.
  - `game_item`: the game's `toReviewCard`.
- **Filters:** Palabras / Frases / Conjugar / Errores de juegos. Mode: mixed / cloze / scramble.
- **Keyboard:** Enter/Space continues, as in Spanyard.
- **Lexicon** (`/repaso/lexico`): 1000-word grid coloured by box, tap for details, search; plus a "Fluency score" (Spanyard's weighted mastery).
- Past + future tense practice (from IDEA.md): the **Conjugar** drill can be filtered by tense group ("Pasado": Pretérito+Imperfecto+Perfecto, "Futuro").

---

## 8. Phrases, Grammar, Diary

Port from memo with behaviour unchanged (see `memo/README.md` "Behavior notes"). Changes:
- DB schema `todo` and `user_id`.
- Phrase row menu gains "add to Repaso".
- Diary Claude feedback and phrase AI go through the shared `lib/ai/`.
- Grammar topic pages get a "Practise" link when a related drill or game exists (e.g. preterite-vs-imperfect topic → Diorama and Laberinto; location phrases → Dónde; mapping lives in the registry's `skills` tags).

---

## 9. Non-functional

- **Security:** service-role key server-only; every Server Action calls `requireSession()`; `proxy.ts` gates all routes except `/login` and static files; no anon policies on `todo`.
- **Performance:** non-game pages ship no three.js; Lighthouse mobile ≥ 85 performance on `/frases`; games hold ≥ 30 fps on a mid-range phone (verify with DPR throttle).
- **Accessibility:** tap alternatives for drags, visible focus, `prefers-reduced-motion`, text contrast AA on all tokens.
- **Offline:** phrase board keeps memo's localStorage snapshot; nothing else is required offline.
- **Env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `APP_PASSWORD`, `AUTH_SECRET`. Without them, show memo's Setup screen instead of crashing.

---

## 10. Implementation plan (phases)

Each phase ends green on `typecheck`, `lint`, `test`, `build`, plus the listed checks.

- [ ] **P1 Scaffold + design system:** Next app in `todo/app`, tokens and primitives ported from memo, shell with bottom bar / left rail, `proxy.ts` password gate, Setup screen. *Check:* screenshots at 390×844 and 1440×900.
- [ ] **P2 Database:** `0001_todo_schema.sql`, `0002_copy_legacy.sql`, content seeds, `verify-migration.ts`. *Check:* row counts match. *Manual (user):* expose `todo` schema in Supabase API settings (or give Claude a DB connection string to apply migrations).
- [ ] **P3 Frases + Ask:** port memo board and chat to schema `todo`. *Check:* CRUD, dnd reorder, AI suggest, reload persistence.
- [ ] **P4 Gramática + Diario:** port both. *Check:* done toggle, diary feedback round-trip.
- [ ] **P5 SRS engine + Repaso:** Leitner engine plus kinds (word, phrase, conjugation), session runner, Cloze/Scramble/MC re-skinned, lexicon, Imperfecto forms added. *Check:* unit tests for leitner + session builder; migrated Spanyard boxes show correctly in lexicon.
- [ ] **P6 Game framework + ports:** registry, `game_progress`/`game_attempts`, `/juegos` grid, Laberinto and Diorama ported with memo HUD + palette tint, `game_item` SRS kind. *Check:* ported playtest scripts run all rooms/nodes on desktop and mobile viewports.
- [ ] **P7 Dónde papercraft rebuild:** 3D diorama, rotation camera, animated objects, find/place/pin/build, all 15 tasks. *Check:* contract + judge tests; headless playthrough of all tasks at 390×844 and 1440×900; screenshots compared against `img/donde_new_style.png`.
- [ ] **P8 Hoy + polish:** home dashboard, grammar↔game links, reduced motion, a11y pass.
- [ ] **P9 Deploy:** `vercel` CLI deploy to a new project, env vars set, smoke test prod. *Manual (user):* confirm Vercel project/team and retire old apps whenever ready.

---

## 11. Open items / risks

- **Dónde rebuild effort:** procedural papercraft needs careful texture work to look like the reference. If it falls short, fallback is a small set of GLTF paper models (needs user approval for asset sources).
- **Laberinto on mobile:** first-person controls on phones are the weakest UX; the tap-a-door-to-walk shortcut mitigates this.
- **Schema exposure / migration apply:** needs either the user in the Supabase dashboard or a DB connection string for Claude.
- **Spanyard old password** (`SPANYARD_PASSWORD`) is dropped; `APP_PASSWORD` covers everything.
