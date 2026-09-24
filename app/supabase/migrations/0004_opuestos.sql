-- todo — El Rayo Modificador (game `opuestos`, PRD_OPPOSITES.md)
-- Spanish opposites as physics modifiers. Run after 0001–0003. Idempotent.
-- Content rows come from supabase/seed/opuestos.sql (generated from src/content/opuestos.json).

-- One row per adjective. Ids are slugs ('pesado') so review refs stay stable
-- (the PRD's UUIDs would change on every re-seed).
create table if not exists todo.opuestos_words (
  id             text primary key,
  word           text not null,
  antonym_id     text references todo.opuestos_words (id) deferrable initially deferred,
  -- what the ray changes: rapier_mass, rapier_friction, rapier_restitution, scale, …
  -- (free text on purpose: a new physics effect should not need a migration)
  engine_target  text not null,
  value_modifier real not null,
  shader_trigger text not null,
  translation    text not null,
  -- size, weight, shape, touch, temperature, condition, pace, …
  category       text not null,
  sort           integer not null default 0
);

create table if not exists todo.opuestos_levels (
  id        text primary key,
  sort      integer not null unique,
  title_es  text not null,
  title_en  text not null,
  -- the Spanish clue shown when the level opens, and its English gloss
  clue_es   text not null,
  clue_en   text not null,
  -- adjectives offered by the ray in this level
  words     text[] not null default '{}',
  -- objects, obstacles, goal zone (read by the game's scene builder)
  layout    jsonb not null check (jsonb_typeof(layout) = 'object'),
  created_at timestamptz not null default now()
);

alter table todo.opuestos_words  enable row level security;
alter table todo.opuestos_levels enable row level security;
grant all on todo.opuestos_words, todo.opuestos_levels to service_role;

insert into todo.games (slug, title, sort) values ('opuestos', 'El Rayo Modificador', 4)
on conflict (slug) do nothing;
