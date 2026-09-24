import PageHeader from "@/design/PageHeader";
import { notFound } from "next/navigation";
import { isConfigured } from "@/lib/db";
import { loadDay } from "@/features/diary/queries";
import {
  courseWeek,
  formatDayLong,
  isCourseDay,
  isValidDay,
  isWeekend,
  toDayString,
} from "@/features/diary/diary";
import Setup from "@/design/Setup";
import SentenceList from "@/features/diary/SentenceList";
import NoteList from "@/features/diary/NoteList";
import TagEditor from "@/features/diary/TagEditor";

export const dynamic = "force-dynamic";

export default async function DayPage({
  params,
}: {
  params: Promise<{ day: string }>;
}) {
  const { day } = await params;
  if (!isValidDay(day)) notFound();
  if (!isConfigured()) return <Setup />;

  let content;
  try {
    content = await loadDay(day);
  } catch (cause) {
    return (
      <Setup error={cause instanceof Error ? cause.message : String(cause)} />
    );
  }

  const week = courseWeek(day);
  const label = isCourseDay(day)
    ? isWeekend(day)
      ? `Semana ${week} · fin de semana`
      : `Semana ${week} · día de curso`
    : "Fuera del curso";

  return (
    <div className="mx-auto flex min-h-full max-w-[520px] flex-col bg-page lg:max-w-[720px]">
      <PageHeader back={{ href: "/diario", label: "Diario" }} aside={label} />

      <main className="flex-1 px-[18px] pt-4 pb-7">
        <h1 className="text-[22px] leading-tight font-bold capitalize">
          {formatDayLong(day)}
        </h1>
        <p className="mt-1 text-[15px] text-muted">
          {day === toDayString(new Date()) ? "Hoy" : day}
        </p>

        <SentenceList day={day} initial={content.sentences} />
        <NoteList day={day} initial={content.notes} />
        <TagEditor day={day} initial={content.tags} />
      </main>
    </div>
  );
}
