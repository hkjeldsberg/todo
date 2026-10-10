-- todo — Glosario: archive words instead of deleting them. Run after 0010. Idempotent.
-- An archived word is hidden from the list, search and checks; it can be restored (or deleted for good)
-- from the Archive at the bottom of the Glosario.
alter table todo.glossary_words add column if not exists archived_at timestamptz;
create index if not exists glossary_words_archived_idx on todo.glossary_words (user_id, archived_at);
