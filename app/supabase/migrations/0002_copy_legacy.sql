-- todo — copy data from the legacy app schemas into `todo` (PRD §4.7)
--
-- Run after 0001_todo_schema.sql. Idempotent: rows that already exist are skipped, so it
-- can be re-run safely. Legacy schemas are only READ — nothing in them is changed.
-- A legacy table that doesn't exist in this project is skipped with a NOTICE.
--
--   memo.*        → scenarios, categories, phrases, grammar_progress, diary_*
--   spanyard.*    → words, word_sentences, srs_items (kind = 'word')
--   donde.*       → donde_pages, donde_tasks
--   ellabirinto.* → laberinto_nodes
--   tense.*       → tense_rooms, tense_puzzles
--
-- Game progress (localStorage in the old apps) is intentionally not migrated.
-- Ids are preserved, so references between copied rows stay valid.

begin;

set constraints all deferred;

-- Runs `stmt` only when every table in `sources` exists.
create or replace function pg_temp.copy_if(sources text[], stmt text)
returns void language plpgsql as $$
declare s text;
begin
  foreach s in array sources loop
    if to_regclass(s) is null then
      raise notice 'skip (% missing): %', s, left(stmt, 60);
      return;
    end if;
  end loop;
  execute stmt;
end $$;

-- ── memo ────────────────────────────────────────────────────────────────────

select pg_temp.copy_if(array['memo.scenarios'], $q$
  insert into todo.scenarios (id, name, sort_order, created_at)
  select id, name, sort_order, created_at from memo.scenarios
  on conflict (id) do nothing
$q$);

select pg_temp.copy_if(array['memo.categories'], $q$
  insert into todo.categories (id, scenario_id, name, sort_order, created_at)
  select id, scenario_id, name, sort_order, created_at from memo.categories
  on conflict (id) do nothing
$q$);

select pg_temp.copy_if(array['memo.phrases'], $q$
  insert into todo.phrases (id, scenario_id, category_id, spanish_text, translation_text, sort_order, created_at)
  select id, scenario_id, category_id, spanish_text, translation_text, sort_order, created_at from memo.phrases
  on conflict (id) do nothing
$q$);

select pg_temp.copy_if(array['memo.grammar_progress'], $q$
  insert into todo.grammar_progress (slug, done_at)
  select slug, done_at from memo.grammar_progress
  on conflict do nothing
$q$);

select pg_temp.copy_if(array['memo.diary_days'], $q$
  insert into todo.diary_days (day, tags, updated_at)
  select day, tags, updated_at from memo.diary_days
  on conflict do nothing
$q$);

select pg_temp.copy_if(array['memo.diary_notes'], $q$
  insert into todo.diary_notes (id, day, body, sort_order, created_at)
  select id, day, body, sort_order, created_at from memo.diary_notes
  on conflict (id) do nothing
$q$);

select pg_temp.copy_if(array['memo.diary_sentences'], $q$
  insert into todo.diary_sentences (id, day, position, spanish, english, feedback, feedback_at, created_at)
  select id, day, position, spanish, english, feedback, feedback_at, created_at from memo.diary_sentences
  on conflict do nothing
$q$);

-- ── spanyard ────────────────────────────────────────────────────────────────

select pg_temp.copy_if(array['spanyard.words'], $q$
  insert into todo.words (id, rank, spanish, english, pos)
  overriding system value
  select id, rank, spanish, english, pos from spanyard.words
  on conflict do nothing
$q$);

-- keep the identity ahead of the copied ids
select setval(
  pg_get_serial_sequence('todo.words', 'id'),
  greatest((select coalesce(max(id), 0) from todo.words), 1),
  (select count(*) > 0 from todo.words)
);

-- word_sentences has a uuid key; skip words that already have a copied sentence
select pg_temp.copy_if(array['spanyard.sentences'], $q$
  insert into todo.word_sentences (word_id, spanish, english, cloze, created_at)
  select s.word_id, s.spanish, s.english, s.cloze, s.created_at
  from spanyard.sentences s
  where exists (select 1 from todo.words w where w.id = s.word_id)
    and not exists (
      select 1 from todo.word_sentences t
      where t.word_id = s.word_id and t.spanish = s.spanish
    )
$q$);

select pg_temp.copy_if(array['spanyard.user_words'], $q$
  insert into todo.srs_items (kind, ref, source, box, next_review_at, last_reviewed_at, reps, created_at)
  select 'word', 'word:' || u.word_id, 'spanyard', u.box, u.next_review_at, u.last_reviewed_at,
         case when u.last_reviewed_at is null then 0 else 1 end,
         coalesce(u.last_reviewed_at, now())
  from spanyard.user_words u
  where exists (select 1 from todo.words w where w.id = u.word_id)
  on conflict (user_id, kind, ref) do nothing
$q$);

-- ── donde ───────────────────────────────────────────────────────────────────

select pg_temp.copy_if(array['donde.pages'], $q$
  insert into todo.donde_pages (page_id, sort, title_es, title_en, visual_layer)
  select page_id, sort, title_es, title_en, visual_layer from donde.pages
  on conflict do nothing
$q$);

select pg_temp.copy_if(array['donde.tasks'], $q$
  insert into todo.donde_tasks (id, page_id, sort, mechanic, prompt_text, prompt_en, draggable_id,
                                target_zone, error_note, success_note, zone_notes, build, tags, level)
  select id, page_id, sort, mechanic, prompt_text, prompt_en, draggable_id,
         target_zone, error_note, success_note, zone_notes, build, tags, level
  from donde.tasks
  on conflict do nothing
$q$);

-- ── ellabirinto ─────────────────────────────────────────────────────────────

select pg_temp.copy_if(array['ellabirinto.nodes'], $q$
  insert into todo.laberinto_nodes (node_id, island_zone, seq, ambient_prompt, doors,
                                    feedback_imperfect, next_node_id, created_at)
  select node_id, island_zone, seq, ambient_prompt, doors, feedback_imperfect, next_node_id, created_at
  from ellabirinto.nodes
  on conflict do nothing
$q$);

-- ── tense ───────────────────────────────────────────────────────────────────

select pg_temp.copy_if(array['tense.rooms'], $q$
  insert into todo.tense_rooms (id, order_index, title, subtitle, focus)
  select id, order_index, title, subtitle, focus from tense.rooms
  on conflict do nothing
$q$);

select pg_temp.copy_if(array['tense.puzzles'], $q$
  insert into todo.tense_puzzles (id, room_id, order_index, scene_object, sentence_pre, sentence_post,
                                  verb_base, options, rule_feedback, translation, anim_trigger)
  select id, room_id, order_index, scene_object, sentence_pre, sentence_post,
         verb_base, options, rule_feedback, translation, anim_trigger
  from tense.puzzles
  on conflict do nothing
$q$);

commit;

-- Row counts, legacy vs todo (read-only; missing legacy tables show null)
select source, legacy, todo from (values
  ('memo.scenarios',        (select count(*) from todo.scenarios)),
  ('memo.categories',       (select count(*) from todo.categories)),
  ('memo.phrases',          (select count(*) from todo.phrases)),
  ('memo.grammar_progress', (select count(*) from todo.grammar_progress)),
  ('memo.diary_days',       (select count(*) from todo.diary_days)),
  ('memo.diary_notes',      (select count(*) from todo.diary_notes)),
  ('memo.diary_sentences',  (select count(*) from todo.diary_sentences)),
  ('spanyard.words',        (select count(*) from todo.words)),
  ('spanyard.sentences',    (select count(*) from todo.word_sentences)),
  ('spanyard.user_words',   (select count(*) from todo.srs_items where source = 'spanyard')),
  ('donde.pages',           (select count(*) from todo.donde_pages)),
  ('donde.tasks',           (select count(*) from todo.donde_tasks)),
  ('ellabirinto.nodes',     (select count(*) from todo.laberinto_nodes)),
  ('tense.rooms',           (select count(*) from todo.tense_rooms)),
  ('tense.puzzles',         (select count(*) from todo.tense_puzzles))
) as t(source, todo)
cross join lateral (
  select case when to_regclass(t.source) is null then null
              else (xpath('/row/c/text()',
                     query_to_xml(format('select count(*) as c from %s', t.source), false, true, '')))[1]::text::bigint
         end as legacy
) l
order by source;
