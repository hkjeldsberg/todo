import Link from "next/link";
import { isConfigured } from "@/lib/db";
import { loadDiaryIndex } from "@/features/diary/queries";
import {
  COURSE_END,
  COURSE_START,
  courseMonths,
  formatDayLong,
  toDayString,
} from "@/features/diary/diary";
import PageHeader from "@/design/PageHeader";
import Setup from "@/design/Setup";
import CalendarMonth from "@/features/diary/CalendarMonth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Diario · todo" };

export default async function DiaryPage() {
  if (!isConfigured()) return <Setup />;

  let index;
  try {
    index = await loadDiaryIndex();
  } catch (cause) {
    return (
      <Setup error={cause instanceof Error ? cause.message : String(cause)} />
    );
  }

  const today = toDayString(new Date());
  const months = courseMonths();
  const written = Object.values(index).filter(
    (summary) => summary.notes || summary.sentences || summary.tags,
  ).length;

  return (
    <div className="mx-auto flex min-h-full max-w-[520px] flex-col bg-page lg:max-w-[720px]">
      <PageHeader title="Diario" />

      <main className="flex-1 px-[18px] pt-4 pb-7">
        <p className="mb-1 text-[15px] text-muted">
          Curso intensivo — {formatDayLong(COURSE_START)} to{" "}
          {formatDayLong(COURSE_END)}.
        </p>
        <p className="mb-5 text-[13px] text-faint">
          {written === 0
            ? "Tap a day to write."
            : `${written} ${written === 1 ? "day" : "days"} written so far.`}
        </p>

        <Link
          href={`/diario/${today}`}
          className="press mb-6 flex items-center gap-3 rounded-[20px] bg-ink p-4 text-on-ink shadow-[0_6px_0_var(--ink-shadow)]"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold text-on-ink/70">
              Today
            </span>
            <span className="block truncate text-[16px] leading-tight font-bold">
              {formatDayLong(today)}
            </span>
          </span>
          <span aria-hidden className="text-[18px] font-bold">
            →
          </span>
        </Link>

        <div className="flex flex-col gap-6">
          {months.map((month) => (
            <CalendarMonth
              key={month.title}
              month={month}
              index={index}
              today={today}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
