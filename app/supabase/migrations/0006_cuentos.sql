-- todo — Cuentos, the Smart Reader (game `cuentos`, ../PRD_STORY.md)
-- Claude-written micro-stories stored pre-parsed, plus cloze cards saved from them into
-- Repaso. Run after 0001–0005. Idempotent.

create table if not exists todo.stories (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default '00000000-0000-0000-0000-000000000001'
                references todo.users (id) on delete cascade,
  created_at    timestamptz not null default now(),
  topic         text not null,
  level         text not null default 'A2',
  -- tenses the prompt forced, e.g. {preterite,subjunctive,reflexive}
  target_tenses text[] not null,
  title         text not null,
  -- the pre-parsed story: { title, nodes: [{ type, speaker?, sentences: [{ translation, tokens }] }] }
  content_json  jsonb not null check (jsonb_typeof(content_json) = 'object'),
  model         text
);

create index if not exists stories_user_idx on todo.stories (user_id, created_at desc);

-- A word saved from a story (the PRD's `flashcards`): reviewed in Repaso as kind 'story'.
create table if not exists todo.story_cards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default '00000000-0000-0000-0000-000000000001'
              references todo.users (id) on delete cascade,
  story_id    uuid not null references todo.stories (id) on delete cascade,
  -- '<node>:<sentence>:<token>' inside content_json
  token_key   text not null,
  answer      text not null,               -- the form in the gap, e.g. 'prueben'
  cloze       text not null,               -- sentence with {{word}} in the gap (front)
  sentence_es text not null,
  sentence_en text not null,               -- back
  lemma       text,
  tense       text,
  translation text not null,               -- the token's own gloss, e.g. 'you try'
  distractors text[] not null default '{}', -- wrong options for the Hint panel
  created_at  timestamptz not null default now(),
  unique (story_id, token_key)
);

alter table todo.stories     enable row level security;
alter table todo.story_cards enable row level security;
grant all on todo.stories, todo.story_cards to service_role;

-- Repaso learns a fifth kind of card.
alter table todo.srs_items drop constraint if exists srs_items_kind_check;
alter table todo.srs_items add constraint srs_items_kind_check
  check (kind in ('word', 'phrase', 'conjugation', 'game_item', 'story'));

-- A removed card (or a deleted story, via cascade) leaves Repaso too.
create or replace function todo.forget_story_card()
returns trigger language plpgsql as $$
begin
  delete from todo.srs_items
  where user_id = old.user_id and kind = 'story' and ref = 'story:' || old.id;
  return old;
end $$;

drop trigger if exists story_cards_forget_review on todo.story_cards;
create trigger story_cards_forget_review
  after delete on todo.story_cards
  for each row execute function todo.forget_story_card();

insert into todo.games (slug, title, sort) values ('cuentos', 'Cuentos', 6)
on conflict (slug) do nothing;
