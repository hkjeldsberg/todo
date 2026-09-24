/**
 * Course calendar. The diary covers one intensive Spanish course — eight weeks,
 * 20 hours a week — so the calendar is bounded by those dates rather than being
 * an open-ended journal.
 */

/** Monday of week 1. */
export const COURSE_START = "2026-09-14";
/** Last course day. */
export const COURSE_END = "2026-11-13";

export type DaySummary = {
  day: string;
  notes: number;
  /** How many of the five sentence slots have Spanish in them. */
  sentences: number;
  tags: number;
};

export type DiaryNote = {
  id: string;
  day: string;
  body: string;
  sort_order: number;
  created_at: string;
};

export type DiarySentence = {
  id: string;
  day: string;
  position: number;
  spanish: string;
  english: string;
  feedback: string | null;
  feedback_at: string | null;
};

export const SENTENCES_PER_DAY = 5;

const MONTHS_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const WEEKDAYS_ES = [
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
  "domingo",
];

/** ISO day string (YYYY-MM-DD) built in local time, never UTC-shifted. */
export function toDayString(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${dayOfMonth}`;
}

/** Parse YYYY-MM-DD as a local date, so no timezone can shift the day. */
export function fromDayString(day: string): Date {
  const [year, month, dayOfMonth] = day.split("-").map(Number);
  return new Date(year, month - 1, dayOfMonth);
}

export function isValidDay(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  return toDayString(fromDayString(day)) === day;
}

export function isCourseDay(day: string): boolean {
  return day >= COURSE_START && day <= COURSE_END;
}

/** Monday-based: 0 = Monday … 6 = Sunday, which is how the grid is laid out. */
export function weekdayIndex(day: string): number {
  return (fromDayString(day).getDay() + 6) % 7;
}

export function isWeekend(day: string): boolean {
  return weekdayIndex(day) >= 5;
}

/** Course week 1-8, or null outside the course. */
export function courseWeek(day: string): number | null {
  if (!isCourseDay(day)) return null;
  const start = fromDayString(COURSE_START);
  const days = Math.floor(
    (fromDayString(day).getTime() - start.getTime()) / 86_400_000,
  );
  return Math.floor(days / 7) + 1;
}

export function formatDayLong(day: string): string {
  const date = fromDayString(day);
  return `${WEEKDAYS_ES[weekdayIndex(day)]} ${date.getDate()} de ${MONTHS_ES[date.getMonth()]}`;
}

export function formatMonth(year: number, month: number): string {
  return `${MONTHS_ES[month]} ${year}`;
}

export type MonthGrid = {
  year: number;
  /** 0-indexed. */
  month: number;
  title: string;
  /** Six rows of seven, Monday first. null = a cell outside this month. */
  weeks: (string | null)[][];
};

/** The months the course touches, as calendar grids. */
export function courseMonths(): MonthGrid[] {
  const start = fromDayString(COURSE_START);
  const end = fromDayString(COURSE_END);
  const months: MonthGrid[] = [];

  for (
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    cursor <= end;
    cursor.setMonth(cursor.getMonth() + 1)
  ) {
    months.push(monthGrid(cursor.getFullYear(), cursor.getMonth()));
  }
  return months;
}

function monthGrid(year: number, month: number): MonthGrid {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // Monday-first offset
  const length = new Date(year, month + 1, 0).getDate();

  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let dayOfMonth = 1; dayOfMonth <= length; dayOfMonth += 1) {
    cells.push(toDayString(new Date(year, month, dayOfMonth)));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }

  return { year, month, title: formatMonth(year, month), weeks };
}

export const WEEKDAY_INITIALS = ["L", "M", "M", "J", "V", "S", "D"];

/**
 * Server actions return this instead of throwing. A thrown error is replaced by
 * a digest in production ("Minified React error #441"), so the reason never
 * reaches the person who needs it; a returned value survives intact.
 */
export type Failure = {
  message: string;
  /** What to do about it, when that is knowable. */
  hint?: string;
  /** True when trying the same thing again might simply work. */
  retryable: boolean;
};

export type Result<T> = { ok: true; data: T } | { ok: false; error: Failure };
