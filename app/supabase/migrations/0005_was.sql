-- todo — El Cómic Dinámico (game `was`, ../was/PRD.md)
-- era / estaba / fue / estuve dropped into 5-panel comic pages. Run after 0001–0004. Idempotent.
-- Content rows come from supabase/seed/was.sql (generated from src/content/was.json).
-- New pages can be added as rows here without a redeploy (the game loads per request).

-- One row per panel. Ids are slugs ('robo_1') so review refs stay stable
-- (the PRD's UUIDs would change on every re-seed).
create table if not exists todo.was_panels (
  id            text primary key,
  -- groups 5 panels into one playable page
  page_id       text    not null,
  panel_order   integer not null check (panel_order >= 1),
  -- establishing = soft frame (era / estaba), action = jagged frame (fue / estuve)
  panel_type    text    not null check (panel_type in ('establishing', 'action')),
  sentence_pre  text    not null default '',
  sentence_post text    not null default '',
  correct_verb  text    not null check (correct_verb in ('era', 'estaba', 'fue', 'estuve')),
  rule_feedback text    not null,
  asset_sketch  text    not null,
  asset_color   text    not null,
  created_at    timestamptz not null default now(),
  unique (page_id, panel_order)
);

alter table todo.was_panels enable row level security;
grant all on todo.was_panels to service_role;

insert into todo.games (slug, title, sort) values ('was', 'El Cómic Dinámico', 5)
on conflict (slug) do nothing;
