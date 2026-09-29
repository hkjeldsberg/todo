-- todo — El Laberinto del Gnomo (game `posiciones`, ../PRD_PLACEMENT.md)
-- Say where the gnome is, as many ways as you can. Run after 0001–0006. Idempotent.
-- Rows come from supabase/seed/posiciones.sql (generated from src/content/posiciones.json).

-- The 80+ location expressions (the PRD's inventory). `ref_count` is the PRD's
-- `references` column, renamed: REFERENCES is a reserved word in SQL.
create table if not exists todo.posiciones_expressions (
  id              text primary key,
  es              text not null,
  en              text not null,
  level           text not null check (level in ('A1', 'A2', 'B1')),
  category        text not null,
  needs_reference boolean not null default true,
  ref_count       integer not null default 1 check (ref_count between 0 and 2),
  region          text,
  notes           text,
  sort            integer not null default 0
);

-- The rooms. Geometry stays in code (the scene layouts), keyed by the same object ids.
create table if not exists todo.posiciones_scenes (
  id           text primary key,
  sort         integer not null unique,
  title_es     text not null,
  title_en     text not null,
  visual_layer text not null,
  -- [{ id, es, gender, number, aliases[] , … }]
  objects      jsonb not null default '[]'::jsonb check (jsonb_typeof(objects) = 'array'),
  -- authored truths geometry can't express: [{ target, expression, refs[] }]
  facts        jsonb not null default '[]'::jsonb check (jsonb_typeof(facts) = 'array'),
  targets      text[] not null default '{}'
);

alter table todo.posiciones_expressions enable row level security;
alter table todo.posiciones_scenes      enable row level security;
grant all on todo.posiciones_expressions, todo.posiciones_scenes to service_role;

insert into todo.games (slug, title, sort) values ('posiciones', 'El Laberinto del Gnomo', 7)
on conflict (slug) do nothing;
