# PRD: Glosario — my own Spanish word list

## 1. Summary
A personal glossary inside the todo app: every Spanish word I write down to memorise, in one searchable two-column list
(Spanish | English). Tapping a word opens a card with the English and Norwegian translations, word type and two example
sentences. New words are added one at a time: I type the Spanish word and my guess at the translation, and Claude
checks it, corrects it if needed and fills in the rest. The words can be sorted alphabetically and grouped by word type
or theme. The existing list is loaded once with an import script.

## 2. Goals and non-goals
**Goals**
- One place for *my* words, separate from the fixed 1000-word frequency list (`todo.words`).
- Adding a word takes under 10 seconds and gives feedback on my guess (that's the learning moment).
- Every word has its translations, type and examples ready to read, with no AI call when I open it.
- Finding a word is fast: search in either language and ignore accents (`nutricionista` finds `nutricionista`, `cafe` finds `café`).

**Non-goals (v1)**
- Not a full dictionary: only words I've added.
- No conjugation tables (Gramática / Repaso already cover verbs).
- No sharing or multi-user support (the app has a single user).

## 3. Users and core flows
Single user (me), on a phone and on a laptop.

### 3.1 Browse
- Route `/glosario`. A two-column list: **Spanish** (left, bold) | **English** (right).
- Nouns show their article: *la mesa*, *el agua*. This matters for gender.
- At the top: a search field and a Sort / Group control. A word count shows below them ("214 words").
- On phones the list is a single scroll with sticky group headers. Rows are at least 44px tall.

### 3.2 Look up (tap a word)
A small card opens as a bottom sheet on phones and a popover on desktop. It shows:
- **Spanish** word + word type + gender (e.g. *la mesa · noun, feminine*)
- **English:** table
- **Norsk:** bord
- **Two example sentences**, each in Spanish with an English translation underneath and the word highlighted.
- **My original guess**, if it differed from the checked translation ("You guessed: *desk*"). This keeps the learning
  moment.
- Theme chips.
- Actions: Edit, Delete (with confirmation), Regenerate examples, Add to Repaso.
- A speaker button that reads the word and sentences aloud with the browser's built-in Spanish voice (Web Speech API).
  Optional in v1.

### 3.3 Add a word
1. Tap **+ Add** (a floating button on phones, a header button on desktop).
2. Enter **Spanish** (required), **my translation** (required) and a theme (optional; suggestions offered).
3. Tap **Check**. One Claude call (§5) returns the corrected entry plus a verdict on my guess:
   - ✓ **Correct**: saved as is.
   - ≈ **Close**: e.g. I wrote *nutritionist* for *la nutricionista* and missed the article. Shows the fix, then saves the corrected version.
   - ✗ **Different**: shows the right translation and a one-line note on what my guess actually means.
   - **Spelling fix** on the Spanish side: e.g. *nutralista* → "Did you mean *nutricionista*?" I confirm before saving.
4. The card from 3.2 is shown once and saved. The **checked translation is what's stored**; my guess is kept in its own field.
5. **Duplicates:** if the word already exists (case- and accent-insensitive, ignoring the article), the existing card opens instead.
6. **If the AI call fails** (offline, timeout, no API key), the word is saved with only my translation, marked *unchecked*, and
   checked again automatically next time the list loads. Nothing I typed is lost.

### 3.4 Sort, group, filter
- **Sort:** Spanish A–Z (default), English A–Z, Newest first. Sorting ignores articles and accents (*el árbol* goes under A).
- **Group by:** None, Word type (noun, verb, adjective, adverb, preposition, expression, other), Theme.
- **Filter:** tap a type or theme chip to show only that group. A filter for *Unchecked* words.
- The last chosen sort/group is remembered on this device (localStorage).

### 3.5 Themes
- A word can have **zero or more themes** (*en la casa*, *en la tienda*, *en el nutricionista*, *en el médico*…).
  Many-to-many, because *el agua* belongs in both the shop and the kitchen.
- Themes are free text, created on the fly from the add form or the card. Claude suggests one from existing themes when adding a word.
- "Scenarios" from the idea = themes. One concept, not two.
- **Open question:** reuse the Frases scenarios (`todo.scenarios`) as the theme list, so a word and a phrase can share
  *En la tienda*? (§9)

## 4. Data model (schema `todo`)
```sql
create table todo.glossary_words (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default '00000000-0000-0000-0000-000000000001'
                  references todo.users (id) on delete cascade,
  spanish         text not null,          -- as displayed, with article for nouns: 'la mesa'
  spanish_key     text not null,          -- lower-case, no accents, no article: 'mesa' (dedupe + sort)
  english         text not null,          -- checked translation
  norwegian       text,                   -- null until checked
  pos             text check (pos in ('noun','verb','adjective','adverb','preposition','expression','other')),
  gender          text check (gender in ('m','f','mf')),        -- nouns only
  my_guess        text,                   -- what I typed, kept for the "you guessed" line
  guess_verdict   text check (guess_verdict in ('correct','close','different')),
  guess_note      text,                   -- one short English line from the checker
  examples        jsonb not null default '[]'::jsonb,   -- [{ es, en }] × 2
  status          text not null default 'unchecked' check (status in ('unchecked','checked')),
  source          text not null default 'manual' check (source in ('manual','import')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, spanish_key)
);

create table todo.glossary_themes (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000001' references todo.users (id) on delete cascade,
  name    text not null,
  unique (user_id, name)
);

create table todo.glossary_word_themes (
  word_id  uuid not null references todo.glossary_words (id) on delete cascade,
  theme_id uuid not null references todo.glossary_themes (id) on delete cascade,
  primary key (word_id, theme_id)
);
```
RLS on, `service_role` only, like the rest of `todo`. Migration: `app/supabase/migrations/0010_glossary.sql`.
Repaso link: "Add to Repaso" creates an `srs_items` row with kind `glossary` and ref `glossary:<id>`. This needs one new kind
and a card type (Spanish → English recall, examples as cloze).

## 5. AI
- **Model:** Claude Haiku (`claude-haiku-4-5`): cheap and fast enough for an add-word check. One call per word, with
  structured (zod) output, from a Server Action. Timeout 8s.
- **Input:** the Spanish as typed, my guess, my existing theme names.
- **Output:**
  ```json
  { "spanish": "la nutricionista", "spelling_fixed": true, "english": "nutritionist", "norwegian": "ernæringsfysiolog",
    "pos": "noun", "gender": "mf", "guess_verdict": "close", "guess_note": "Right word; nouns take their article: la/el nutricionista.",
    "examples": [{ "es": "…", "en": "…" }, { "es": "…", "en": "…" }], "theme_suggestion": "en el nutricionista" }
  ```
- **Example rules:** A2–B1 level, max 12 words, everyday situations, the word used in the sense being translated, Spain
  Spanish unless the word is regional.
- **Stored, not regenerated:** examples and translations are written to the row once. Opening the card makes no AI call.
  "Regenerate examples" is an explicit action.
- **Backfill:** a script (`npm run glossary:enrich`) sends every `unchecked` word through the same prompt.
  It uses the Batch API for the import (half price, nothing waits on it).

## 6. One-time import
- I export my current list as **CSV**: `spanish,english[,theme]`, UTF-8, one word per row.
- `scripts/glossary-import.mjs file.csv` inserts the rows with `source='import'` and `status='unchecked'`. It deduplicates on
  `spanish_key`, can be re-run safely, and prints counts (inserted / duplicate / bad rows).
- Then `npm run glossary:enrich` fills in Norwegian, word type, gender and examples, and fixes wrong translations.
  For imported words the English I wrote becomes `my_guess`, so the corrections show up like any other check.
- Import validation: no empty cells, Spanish ≤ 60 characters, warn on likely English-in-the-Spanish-column mistakes.

## 7. UI notes
- Same sticker design system as Frases and Repaso; no new colours apart from one per word type for the type chips.
- The card must fit a 390×844 screen without scrolling (2 short examples).
- Empty state: "No words yet. Add your first one" plus the Add button.
- The list stays fast with 2,000 words: the client filters a list that is already loaded, so no paging is needed.

## 8. Acceptance criteria
- Adding *nutralista / nutritionist* suggests *la nutricionista*. After I confirm, the saved row has English, Norwegian, type,
  gender, 2 examples and verdict *close*.
- Adding a word that already exists opens the existing card; no duplicate row is created.
- If the AI fails, the word is saved as unchecked and is fixed by the next enrich run.
- Search "cafe" finds *el café*. Sort by Spanish puts *el árbol* under A. Group by Theme shows a word under each of its themes.
- Importing the same CSV twice inserts nothing the second time.
- Opening a card makes no network request to Claude.
- tsc, lint and tests are clean; playtested at 390×844 and 1440×900.

## 9. Open questions
1. **Navigation:** a new tab (the bottom bar would have 7 items), a sub-tab of Frases ("Frases | Glosario"), or under Repaso
   next to Léxico? *Recommendation: a sub-tab of Frases. Both are "things I wrote down".*
   -> A new tab
2. **Themes:** share the Frases scenarios, or keep a separate theme list? *Recommendation: share, if the scenario names
   -> Separate them
   fit words too.*
3. **Repaso:** add every new word automatically, or only when I tap "Add to Repaso"? *Recommendation: manual in v1.*
   -> Manual
4. **Norwegian:** Bokmål? (Assumed yes.)
   -> Bokmål
5. **Overlap with the 1000-word list:** when I add a word that's already in `todo.words`, should the card say so and link
   to its Léxico entry?
   -> No
