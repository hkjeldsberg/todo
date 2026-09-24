-- todo — combined Spanish-learning app (see PRD.md §4)
--
-- Creates schema `todo` with every table the app needs. Idempotent: safe to re-run.
-- Data from the legacy schemas (memo, spanyard, donde, ellabirinto, tense) is copied
-- by 0002_copy_legacy.sql, not here.
--
-- Access model: RLS is enabled on every table with NO policies, so anon/authenticated
-- get nothing. Only the server (service_role, which bypasses RLS) reads and writes.
--
-- After running: Supabase Dashboard → Project Settings → API → Exposed schemas → add `todo`.

create schema if not exists todo;

-- ─────────────────────────────────────────────────────────────────────────────
-- Users (single owner for now; user_id columns make multi-user possible later)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists todo.users (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

-- OWNER: must match the constant in src/lib/user.ts
insert into todo.users (id, name)
values ('00000000-0000-0000-0000-000000000001', 'owner')
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- Phrases (from memo)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists todo.scenarios (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default '00000000-0000-0000-0000-000000000001'
             references todo.users (id) on delete cascade,
  name       text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists todo.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default '00000000-0000-0000-0000-000000000001'
              references todo.users (id) on delete cascade,
  scenario_id uuid not null references todo.scenarios (id) on delete cascade,
  name        text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists todo.phrases (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default '00000000-0000-0000-0000-000000000001'
                   references todo.users (id) on delete cascade,
  scenario_id      uuid not null references todo.scenarios (id) on delete cascade,
  category_id      uuid references todo.categories (id) on delete set null,
  spanish_text     text not null,
  translation_text text not null,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now()
);

create index if not exists scenarios_user_idx  on todo.scenarios (user_id, sort_order);
create index if not exists categories_scenario_idx on todo.categories (scenario_id, sort_order);
create index if not exists phrases_order_idx   on todo.phrases (scenario_id, category_id, sort_order);
create index if not exists phrases_category_idx on todo.phrases (category_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Grammar progress + diary (from memo). Grammar topics themselves live in code.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists todo.grammar_progress (
  user_id uuid not null default '00000000-0000-0000-0000-000000000001'
          references todo.users (id) on delete cascade,
  slug    text not null,
  done_at timestamptz not null default now(),
  primary key (user_id, slug)
);

create table if not exists todo.diary_days (
  user_id    uuid not null default '00000000-0000-0000-0000-000000000001'
             references todo.users (id) on delete cascade,
  day        date not null,
  tags       text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create table if not exists todo.diary_notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default '00000000-0000-0000-0000-000000000001'
             references todo.users (id) on delete cascade,
  day        date not null,
  body       text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists todo.diary_sentences (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default '00000000-0000-0000-0000-000000000001'
              references todo.users (id) on delete cascade,
  day         date not null,
  position    integer not null check (position between 0 and 4),
  spanish     text not null default '',
  english     text not null default '',
  feedback    text,
  feedback_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (user_id, day, position)
);

create index if not exists diary_notes_day_idx on todo.diary_notes (user_id, day, sort_order);

-- ─────────────────────────────────────────────────────────────────────────────
-- Vocabulary + verbs (from Spanyard)
-- ─────────────────────────────────────────────────────────────────────────────

-- ids are preserved from spanyard.words; 0002 resets the identity afterwards
create table if not exists todo.words (
  id      integer primary key generated by default as identity,
  rank    integer not null unique,
  spanish text not null,
  english text not null,
  pos     text
);

-- JIT Claude sentence cache; several per word allowed so sessions can vary
create table if not exists todo.word_sentences (
  id         uuid primary key default gen_random_uuid(),
  word_id    integer not null references todo.words (id) on delete cascade,
  spanish    text not null,
  english    text not null,
  cloze      text not null,  -- spanish with {{word}} placeholder
  created_at timestamptz not null default now()
);

create index if not exists word_sentences_word_idx on todo.word_sentences (word_id);

-- forms: { "<Tense>": { "<pronoun>": "<form>" } }
-- tenses: Presente, Pretérito, Imperfecto, Perfecto, Futuro
create table if not exists todo.verbs (
  infinitive   text primary key,
  english      text not null,
  is_irregular boolean not null default false,
  forms        jsonb not null check (jsonb_typeof(forms) = 'object')
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Unified spaced repetition (Leitner, 5 boxes)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists todo.srs_items (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default '00000000-0000-0000-0000-000000000001'
                   references todo.users (id) on delete cascade,
  kind             text not null check (kind in ('word', 'phrase', 'conjugation', 'game_item')),
  -- word:<id> | phrase:<uuid> | conj:<infinitive>:<tense>:<pronoun> | game:<slug>:<item_id>
  ref              text not null,
  source           text not null,  -- 'spanyard' | 'phrases' | 'conjugar' | 'game:<slug>'
  box              integer not null default 1 check (box between 1 and 5),
  next_review_at   timestamptz not null default now(),
  last_reviewed_at timestamptz,
  reps             integer not null default 0,
  lapses           integer not null default 0,
  suspended        boolean not null default false,
  created_at       timestamptz not null default now(),
  unique (user_id, kind, ref)
);

create index if not exists srs_items_due_idx
  on todo.srs_items (user_id, next_review_at) where not suspended;
create index if not exists srs_items_kind_idx on todo.srs_items (user_id, kind, box);

create table if not exists todo.srs_reviews (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default '00000000-0000-0000-0000-000000000001'
              references todo.users (id) on delete cascade,
  item_id     uuid not null references todo.srs_items (id) on delete cascade,
  correct     boolean not null,
  mode        text,   -- 'cloze' | 'scramble' | 'mc' | 'recall' | …
  answer      text,
  reviewed_at timestamptz not null default now()
);

create index if not exists srs_reviews_item_idx on todo.srs_reviews (item_id, reviewed_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- Games: registry, progress, attempts
-- ─────────────────────────────────────────────────────────────────────────────

-- which games from the code registry are shown, and in what order
create table if not exists todo.games (
  slug    text primary key,
  title   text not null,
  sort    integer not null default 0,
  enabled boolean not null default true
);

insert into todo.games (slug, title, sort) values
  ('donde',     'Dónde',             1),
  ('tense',     'The Memory Diorama', 2),
  ('laberinto', 'El Laberinto',      3)
on conflict (slug) do nothing;

create table if not exists todo.game_progress (
  user_id    uuid not null default '00000000-0000-0000-0000-000000000001'
             references todo.users (id) on delete cascade,
  game_slug  text not null references todo.games (slug) on delete cascade,
  state      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, game_slug)
);

create table if not exists todo.game_attempts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default '00000000-0000-0000-0000-000000000001'
             references todo.users (id) on delete cascade,
  game_slug  text not null references todo.games (slug) on delete cascade,
  item_ref   text not null,
  correct    boolean not null,
  answer     text,
  created_at timestamptz not null default now()
);

create index if not exists game_attempts_idx on todo.game_attempts (user_id, game_slug, created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- Game content: Dónde (from donde.pages / donde.tasks)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists todo.donde_pages (
  page_id      text primary key,
  sort         integer not null unique,
  title_es     text not null,
  title_en     text not null,
  -- widened when new 3D scenes are added (PRD §6.1)
  visual_layer text not null check (visual_layer in ('pop_up_apartment', 'polaroid_plaza', 'botanico_map'))
);

create table if not exists todo.donde_tasks (
  id           text primary key,
  page_id      text not null references todo.donde_pages (page_id) on delete cascade,
  sort         integer not null,
  mechanic     text not null check (mechanic in ('drag', 'flap', 'pick', 'pin', 'build')),
  prompt_text  text not null,
  prompt_en    text not null,
  draggable_id text,
  target_zone  text not null,
  error_note   text not null,
  success_note text not null,
  zone_notes   jsonb not null default '{}'::jsonb,
  build        jsonb,
  tags         text[] not null default '{}',
  level        text not null check (level in ('A1', 'A2', 'B1')),
  unique (page_id, sort),
  check (mechanic <> 'drag' or draggable_id is not null),
  check (mechanic <> 'build' or build is not null)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Game content: El Laberinto (from ellabirinto.nodes)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists todo.laberinto_nodes (
  node_id            text primary key,
  island_zone        text not null check (island_zone in (
                       'tenerife', 'gran_canaria', 'lanzarote', 'fuerteventura',
                       'la_palma', 'la_gomera', 'el_hierro')),
  seq                integer not null,
  ambient_prompt     text not null,
  doors              jsonb not null check (jsonb_typeof(doors) = 'array' and jsonb_array_length(doors) = 3),
  feedback_imperfect text,
  next_node_id       text references todo.laberinto_nodes (node_id) deferrable initially deferred,
  created_at         timestamptz not null default now()
);

create index if not exists laberinto_nodes_seq_idx on todo.laberinto_nodes (seq);

-- ─────────────────────────────────────────────────────────────────────────────
-- Game content: The Memory Diorama (from tense.rooms / tense.puzzles)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists todo.tense_rooms (
  id          text primary key,         -- slug, e.g. 'cocina'
  order_index integer not null unique,
  title       text not null,            -- Spanish title
  subtitle    text not null,            -- English subtitle
  focus       text not null             -- learning focus, shown in UI
);

create table if not exists todo.tense_puzzles (
  id            uuid primary key default gen_random_uuid(),
  room_id       text not null references todo.tense_rooms (id) on delete cascade,
  order_index   integer not null,
  scene_object  text not null,          -- target mesh id in the R3F room
  sentence_pre  text not null,
  sentence_post text not null,
  verb_base     text not null,          -- infinitive
  options       jsonb not null check (jsonb_typeof(options) = 'array'),  -- [{ form, type, correct }]
  rule_feedback text not null,
  translation   text,
  anim_trigger  text not null,
  unique (room_id, order_index),
  unique (room_id, scene_object)
);

create index if not exists tense_puzzles_room_idx on todo.tense_puzzles (room_id, order_index);

-- ─────────────────────────────────────────────────────────────────────────────
-- Access: server only. RLS on, no policies → anon/authenticated see nothing.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'todo' loop
    execute format('alter table todo.%I enable row level security', t.tablename);
  end loop;
end $$;

grant usage on schema todo to service_role;
grant all on all tables    in schema todo to service_role;
grant all on all sequences in schema todo to service_role;
alter default privileges in schema todo grant all on tables    to service_role;
alter default privileges in schema todo grant all on sequences to service_role;

revoke all on all tables in schema todo from anon, authenticated;
