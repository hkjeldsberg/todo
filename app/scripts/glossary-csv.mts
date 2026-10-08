// CSV parsing + validation for the one-time glossary import (PRD §6). Pure, so it's unit-tested.

/** RFC 4180-ish: commas, "quoted, fields", "" for a quote inside quotes, CRLF or LF. */
export function parseCsv(text: string): string[][] {
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
    else if (c === ",") {
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

export type ImportRow = { line: number; spanish: string; english: string; themes: string[] };
export type ImportProblem = { line: number; message: string };

const ENGLISH_HINT = /^(the|to|a|an)\s|\b(the|and|with|of)\b/i;

/** spanish,english[,theme] rows (header optional; themes split on ;). */
export function validateRows(rows: string[][]): { ok: ImportRow[]; bad: ImportProblem[]; warnings: ImportProblem[] } {
  const ok: ImportRow[] = [];
  const bad: ImportProblem[] = [];
  const warnings: ImportProblem[] = [];
  rows.forEach((cells, index) => {
    const line = index + 1;
    const [spanish = "", english = "", theme = ""] = cells.map((c) => c.trim());
    if (index === 0 && spanish.toLowerCase() === "spanish") return;
    if (!spanish || !english) return void bad.push({ line, message: "empty Spanish or English cell" });
    if (spanish.length > 60) return void bad.push({ line, message: `Spanish longer than 60 characters: ${spanish.slice(0, 30)}…` });
    if (ENGLISH_HINT.test(spanish)) warnings.push({ line, message: `"${spanish}" looks like English in the Spanish column` });
    ok.push({ line, spanish, english, themes: theme.split(";").map((t) => t.trim().toLocaleLowerCase("es")).filter(Boolean) });
  });
  return { ok, bad, warnings };
}
