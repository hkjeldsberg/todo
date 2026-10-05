-- todo — El Probador (game `probador`, ../PRD_CLOTHES.md)
-- quedar / parecer / parecerse a, answered against a dressed-up SVG avatar. Run after 0001–0008. Idempotent.
-- Rows come from supabase/seed/probador.sql (generated from src/content/probador.json).
-- Tables are prefixed: the PRD's todo.prompts / todo.player_stats are too generic for a shared schema.

-- One avatar look. `layers` names SVG components in features/games/probador/avatar:
-- [{ item, color, fit? }], fit = big | small | long | short.
create table if not exists todo.probador_outfits (
  id             text primary key,
  avatar         jsonb not null default '{}'::jsonb check (jsonb_typeof(avatar) = 'object'),
  layers         jsonb not null check (jsonb_typeof(layers) = 'array'),
  description    text,
  intended_flaw  text
);

-- One prompt per row. The answer is built in three taps (pronoun → verb → complement),
-- so the PRD's flat distractor strings become per-slot lists.
create table if not exists todo.probador_prompts (
  id                    text primary key,
  outfit_id             text not null references todo.probador_outfits (id) on delete cascade,
  target_verb           text not null check (target_verb in ('quedar', 'parecer', 'parecerse')),
  -- e.g. '¿Cómo le {verb} la chaqueta?'; question_fill is what goes in {verb} ('queda')
  question_text         text not null check (question_text like '%{verb}%'),
  question_fill         text not null,
  correct_answer_syntax text not null,                 -- 'Le queda grande.'
  answer_parts          jsonb not null check (jsonb_typeof(answer_parts) = 'object'),        -- { pronoun, verb, complement }
  distractor_options    jsonb not null check (jsonb_typeof(distractor_options) = 'object'),  -- { pronoun: [], verb: [], complement: [] }
  english_translation   text not null
);

-- Spaced repetition per prompt (the PRD's player_stats). No row = new.
create table if not exists todo.probador_stats (
  user_id                  uuid not null default '00000000-0000-0000-0000-000000000001'
                           references todo.users (id) on delete cascade,
  prompt_id                text not null references todo.probador_prompts (id) on delete cascade,
  times_encountered        integer not null default 0 check (times_encountered >= 0),
  times_correct            integer not null default 0 check (times_correct >= 0),
  -- daily sprints answered right first time, in a row; 3 → weekly maintenance
  streak                   integer not null default 0 check (streak >= 0),
  current_interval_minutes integer not null default 10 check (current_interval_minutes > 0),
  last_played_at           timestamptz not null default now(),
  due_at                   timestamptz not null default now(),
  primary key (user_id, prompt_id)
);

alter table todo.probador_outfits enable row level security;
alter table todo.probador_prompts enable row level security;
alter table todo.probador_stats enable row level security;
grant all on todo.probador_outfits to service_role;
grant all on todo.probador_prompts to service_role;
grant all on todo.probador_stats to service_role;

insert into todo.games (slug, title, sort) values ('probador', 'El Probador', 9)
on conflict (slug) do nothing;
