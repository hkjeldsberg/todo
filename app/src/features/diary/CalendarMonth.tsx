import Link from "next/link";
import {
  WEEKDAY_INITIALS,
  isCourseDay,
  isWeekend,
  type DaySummary,
  type MonthGrid,
} from "@/features/diary/diary";

/**
 * One month of the course as a Monday-first grid. Course days carry the accent;
 * weekends inside the course are still open for writing, just quieter.
 */
export default function CalendarMonth({
  month,
  index,
  today,
}: {
  month: MonthGrid;
  index: Record<string, DaySummary>;
  today: string;
}) {
  return (
    <section>
      <h2 className="mb-2 text-[15px] font-bold capitalize">{month.title}</h2>

      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAY_INITIALS.map((initial, position) => (
          <span
            key={position}
            className="pb-1 text-center text-[11px] font-bold text-faint"
          >
            {initial}
          </span>
        ))}

        {month.weeks.flat().map((day, position) => {
          if (!day) return <span key={`blank-${position}`} />;

          const summary = index[day];
          const written = Boolean(
            summary && (summary.notes || summary.sentences || summary.tags),
          );
          const inCourse = isCourseDay(day);
          const weekend = isWeekend(day);
          const isToday = day === today;

          return (
            <Link
              key={day}
              href={`/diario/${day}`}
              className={`press relative grid aspect-square place-items-center rounded-[14px] text-[14px] font-bold ${
                inCourse
                  ? weekend
                    ? "bg-pill text-muted"
                    : "bg-card shadow-[0_3px_0_var(--card-shadow)]"
                  : "bg-transparent text-faint"
              } ${isToday ? "ring-2 ring-accent" : ""}`}
            >
              {Number(day.slice(8))}

              {/* One dot means the day has something on it; the ring means today. */}
              {written && (
                <span
                  aria-hidden
                  className="absolute bottom-1.5 h-1.5 w-1.5 rounded-full bg-accent"
                />
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
