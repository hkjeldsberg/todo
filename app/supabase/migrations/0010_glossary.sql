-- todo — Glosario, my own Spanish word list (../PRD_GLOSSARY.md). Run after 0001–0009. Idempotent.
-- My words come from supabase/seed/glossary_notes.sql (scripts/glossary-notes-sql.mts), then `npm run glossary:enrich`.

create table if not exists todo.glossary_words (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default '00000000-0000-0000-0000-000000000001'
                references todo.users (id) on delete cascade,
  spanish       text not null,          -- as displayed, with article for nouns: 'la mesa'
  spanish_key   text not null,          -- lower-case, no accents, no article: 'mesa' (dedupe + sort)
  english       text not null,          -- checked translation
  norwegian     text,                   -- Bokmål; null until checked
  pos           text check (pos in ('noun', 'verb', 'adjective', 'adverb', 'preposition', 'expression', 'other')),
  gender        text check (gender in ('m', 'f', 'mf')),
  my_guess      text,                   -- what I typed, for the "you guessed" line
  guess_verdict text check (guess_verdict in ('correct', 'close', 'different')),
  guess_note    text,
  examples      jsonb not null default '[]'::jsonb check (jsonb_typeof(examples) = 'array'),  -- [{ es, en }]
  status        text not null default 'unchecked' check (status in ('unchecked', 'checked')),
  source        text not null default 'manual' check (source in ('manual', 'import')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, spanish_key)
);

create table if not exists todo.glossary_themes (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000001'
          references todo.users (id) on delete cascade,
  name    text not null,
  unique (user_id, name)
);

create table if not exists todo.glossary_word_themes (
  word_id  uuid not null references todo.glossary_words (id) on delete cascade,
  theme_id uuid not null references todo.glossary_themes (id) on delete cascade,
  primary key (word_id, theme_id)
);

create index if not exists glossary_word_themes_theme_idx on todo.glossary_word_themes (theme_id);

alter table todo.glossary_words       enable row level security;
alter table todo.glossary_themes      enable row level security;
alter table todo.glossary_word_themes enable row level security;
grant all on todo.glossary_words, todo.glossary_themes, todo.glossary_word_themes to service_role;

-- Repaso learns a sixth kind of card ("Add to Repaso" on a word).
alter table todo.srs_items drop constraint if exists srs_items_kind_check;
alter table todo.srs_items add constraint srs_items_kind_check
  check (kind in ('word', 'phrase', 'conjugation', 'game_item', 'story', 'glossary'));

-- A deleted word leaves Repaso too.
create or replace function todo.forget_glossary_word()
returns trigger language plpgsql as $$
begin
  delete from todo.srs_items
  where user_id = old.user_id and kind = 'glossary' and ref = 'glossary:' || old.id;
  return old;
end $$;

drop trigger if exists glossary_words_forget_review on todo.glossary_words;
create trigger glossary_words_forget_review
  after delete on todo.glossary_words
  for each row execute function todo.forget_glossary_word();
