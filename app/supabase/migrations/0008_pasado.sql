-- todo — El Candado del Tiempo (game `pasado`, ../PRD_PAST.md)
-- Pretérito vs imperfecto drills with a per-verb Leitner engine. Run after 0001–0007. Idempotent.
-- Drill rows come from supabase/seed/pasado.sql (generated from src/content/pasado.json).
-- Verbs are the existing todo.verbs (infinitive key, `forms` has Pretérito + Imperfecto);
-- the PRD's uuid verbs table would clash with it. Run seed/verbs.sql too (adds dar + ver).

-- One contextual sentence per row. Ids are slugs ('comer_1') so Repaso refs survive re-seeds.
create table if not exists todo.past_drills (
  id                  text primary key,
  infinitive          text not null references todo.verbs (infinitive) on delete cascade,
  -- which form fills {verb}: keys of todo.verbs.forms
  person              text not null check (person in ('yo', 'tú', 'él/ella', 'nosotros', 'ellos')),
  sentence_template   text not null check (sentence_template like '%{verb}%'),
  correct_tense       text not null check (correct_tense in ('preterite', 'imperfect')),
  trigger_word        text not null,
  english_translation text not null,
  created_at          timestamptz not null default now()
);

create index if not exists past_drills_verb_idx on todo.past_drills (infinitive);

-- Leitner box per user per verb (the PRD's user_progress). A missing row = box 1, due now.
create table if not exists todo.past_progress (
  user_id          uuid not null default '00000000-0000-0000-0000-000000000001'
                   references todo.users (id) on delete cascade,
  infinitive       text not null references todo.verbs (infinitive) on delete cascade,
  current_box      integer not null default 1 check (current_box between 1 and 5),
  next_review_date timestamptz not null default now(),
  times_correct    integer not null default 0 check (times_correct >= 0),
  times_incorrect  integer not null default 0 check (times_incorrect >= 0),
  updated_at       timestamptz not null default now(),
  primary key (user_id, infinitive)
);

alter table todo.past_drills enable row level security;
alter table todo.past_progress enable row level security;
grant all on todo.past_drills to service_role;
grant all on todo.past_progress to service_role;

insert into todo.games (slug, title, sort) values ('pasado', 'El Candado del Tiempo', 8)
on conflict (slug) do nothing;
