/**
 * The app has one owner for now (password gate, no accounts). Every user-data
 * table carries `user_id` defaulting to this id, so accounts can come later
 * without a data migration. Must match the row seeded in 0001_todo_schema.sql.
 */
export const OWNER_ID = "00000000-0000-0000-0000-000000000001";

export function currentUserId(): string {
  return OWNER_ID;
}
