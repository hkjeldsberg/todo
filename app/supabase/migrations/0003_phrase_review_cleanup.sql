-- todo — keep Repaso in step with the phrase board.
-- Run after 0001/0002. Idempotent.

-- A deleted phrase (directly, or via its scenario's cascade) leaves Repaso too.
create or replace function todo.forget_reviewed_phrase()
returns trigger language plpgsql as $$
begin
  delete from todo.srs_items
  where user_id = old.user_id and kind = 'phrase' and ref = 'phrase:' || old.id;
  return old;
end $$;

drop trigger if exists phrases_forget_review on todo.phrases;
create trigger phrases_forget_review
  after delete on todo.phrases
  for each row execute function todo.forget_reviewed_phrase();
