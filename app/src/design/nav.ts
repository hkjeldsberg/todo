/** Top-level sections. Adding a feature = one entry here + a route in app/(shell). */
export const NAV_ITEMS = [
  { href: "/frases", label: "Frases", hint: "Phrases" },
  { href: "/gramatica", label: "Gramática", hint: "Grammar" },
  { href: "/diario", label: "Diario", hint: "Diary" },
  { href: "/juegos", label: "Juegos", hint: "Games" },
  { href: "/repaso", label: "Repaso", hint: "Review" },
] as const;

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
