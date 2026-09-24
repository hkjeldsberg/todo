import "server-only";
import { db } from "@/lib/db";
import type { DaySummary, DiaryNote, DiarySentence } from "@/features/diary/diary";

export type DayContent = {
  day: string;
  tags: string[];
  notes: DiaryNote[];
  sentences: DiarySentence[];
};

/**
 * One row per day that has anything on it, for the calendar's markers. Small
 * enough (at most ~60 days) to load in full rather than per month.
 */
export async function loadDiaryIndex(): Promise<Record<string, DaySummary>> {
  const [days, notes, sentences] = await Promise.all([
    db().from("diary_days").select("day, tags"),
    db().from("diary_notes").select("day"),
    db().from("diary_sentences").select("day, spanish"),
  ]);

  const failure = days.error ?? notes.error ?? sentences.error;
  if (failure) throw new Error(failure.message);

  const index: Record<string, DaySummary> = {};
  const ensure = (day: string) =>
    (index[day] ??= { day, notes: 0, sentences: 0, tags: 0 });

  for (const row of days.data ?? []) {
    ensure(row.day as string).tags = ((row.tags as string[]) ?? []).length;
  }
  for (const row of notes.data ?? []) ensure(row.day as string).notes += 1;
  for (const row of sentences.data ?? []) {
    if (String(row.spanish ?? "").trim())
      ensure(row.day as string).sentences += 1;
  }

  return index;
}

export async function loadDay(day: string): Promise<DayContent> {
  const [dayRow, notes, sentences] = await Promise.all([
    db().from("diary_days").select("tags").eq("day", day).maybeSingle(),
    db()
      .from("diary_notes")
      .select("*")
      .eq("day", day)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    db()
      .from("diary_sentences")
      .select("*")
      .eq("day", day)
      .order("position", { ascending: true }),
  ]);

  const failure = dayRow.error ?? notes.error ?? sentences.error;
  if (failure) throw new Error(failure.message);

  return {
    day,
    tags: ((dayRow.data?.tags as string[] | undefined) ?? []).filter(Boolean),
    notes: (notes.data ?? []) as DiaryNote[],
    sentences: (sentences.data ?? []) as DiarySentence[],
  };
}
