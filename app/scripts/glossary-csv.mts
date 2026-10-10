// CSV parsing + validation for the glossary import (PRD §6). Pure, so it's unit-tested.

/** Comma or semicolon (Excel in a Norwegian/European locale exports ;), decided by the first line. */
export function detectDelimiter(text: string): "," | ";" {
  const first = text.replace(/^﻿/, "").split(/\r?\n/, 1)[0] ?? "";
  return (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ";" : ",";
}

/** RFC 4180-ish: "quoted, fields", "" for a quote inside quotes, CRLF or LF. */
export function parseCsv(text: string, delimiter: "," | ";" = detectDelimiter(text)): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim()));
}

export type ImportRow = {
  line: number;
  spanish: string;
  english: string;
  norwegian: string | null;
  themes: string[];
  /** YYYY-MM-DD, or null to use the import day. */
  date: string | null;
};
export type ImportProblem = { line: number; message: string };

const ENGLISH_HINT = /^(the|to|an)\s|\b(the|and|with|of)\b/i; // not "a": a la izquierda is Spanish
const COLUMNS = ["spanish", "english", "norwegian", "theme", "date"] as const;
type Column = (typeof COLUMNS)[number];
const ALIASES: Record<string, Column> = { norsk: "norwegian", themes: "theme", tema: "theme", dato: "date", "español": "spanish" };

/** 2026-09-14, 14.09.2026, 14/09/2026, 14/09/26 → 2026-09-14. Null if it isn't a real date. */
export function parseDate(raw: string): string | null {
  const text = raw.trim();
  let y: number, m: number, d: number;
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text);
  if (match) [y, m, d] = [+match[1], +match[2], +match[3]];
  else if ((match = /^(\d{1,2})[./](\d{1,2})[./](\d{2}|\d{4})$/.exec(text))) {
    [d, m, y] = [+match[1], +match[2], +match[3]];
    if (y < 100) y += 2000;
  } else return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date.toISOString().slice(0, 10);
}

/**
 * Rows with a header (Spanish / English / Norwegian / Theme / Date, any order,
 * extra columns ignored) or plain spanish,english[,theme] rows without one.
 * A row needs Spanish plus an English or Norwegian translation; themes split on ;.
 */
export function validateRows(rows: string[][]): { ok: ImportRow[]; bad: ImportProblem[]; warnings: ImportProblem[] } {
  const ok: ImportRow[] = [];
  const bad: ImportProblem[] = [];
  const warnings: ImportProblem[] = [];
  const header = (rows[0] ?? []).map((c) => {
    const name = c.trim().toLowerCase();
    return ALIASES[name] ?? (COLUMNS as readonly string[]).find((col) => col === name) ?? null;
  });
  const hasHeader = header.includes("spanish");
  const index = (col: Column, fallback: number) => (hasHeader ? header.indexOf(col) : fallback);
  const at = { spanish: index("spanish", 0), english: index("english", 1), norwegian: index("norwegian", -1), theme: index("theme", 2), date: index("date", -1) };

  rows.forEach((cells, i) => {
    const line = i + 1;
    if (i === 0 && (hasHeader || cells[0]?.trim().toLowerCase() === "spanish")) return;
    const cell = (k: keyof typeof at) => (at[k] >= 0 ? (cells[at[k]] ?? "").trim() : "");
    const spanish = cell("spanish");
    const english = cell("english");
    const norwegian = cell("norwegian") || null;
    if (!spanish) return void bad.push({ line, message: "empty Spanish cell" });
    if (!english && !norwegian) return void bad.push({ line, message: `no translation for "${spanish}"` });
    if (spanish.length > 60) return void bad.push({ line, message: `Spanish longer than 60 characters: ${spanish.slice(0, 30)}…` });
    let date: string | null = null;
    if (cell("date")) {
      date = parseDate(cell("date"));
      if (!date) warnings.push({ line, message: `unreadable date "${cell("date")}", using today` });
    }
    if (ENGLISH_HINT.test(spanish)) warnings.push({ line, message: `"${spanish}" looks like English in the Spanish column` });
    const themes = cell("theme").split(";").map((t) => t.trim().toLocaleLowerCase("es")).filter(Boolean);
    ok.push({ line, spanish, english, norwegian, themes, date });
  });
  return { ok, bad, warnings };
}
