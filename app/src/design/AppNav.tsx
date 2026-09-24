"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isActive } from "./nav";

/**
 * Bottom tab bar on phones, left rail on laptops. Text only, like the rest of the
 * chrome: the selected section sits on a deeper-yellow chip, so ink stays reserved
 * for the one primary action in view.
 */
export function BottomBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Sections"
      className="grid grid-cols-5 gap-1 border-t-2 border-dash bg-shell px-2 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom))] lg:hidden"
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center justify-center rounded-full px-1 text-center text-[13px] leading-none ${
              active ? "bg-pill-deep font-bold text-ink" : "font-medium text-muted"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SideRail() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Sections"
      className="hidden w-[220px] shrink-0 flex-col gap-1.5 bg-shell px-4 pt-6 lg:flex"
    >
      <Link href="/" className="mb-5 px-3 text-[28px] leading-none font-bold">
        todo
      </Link>
      <Link
        href="/"
        aria-current={pathname === "/" ? "page" : undefined}
        className={`rounded-full px-4 py-2.5 text-[16px] ${
          pathname === "/" ? "bg-pill-deep font-bold" : "font-medium text-muted"
        }`}
      >
        Hoy
      </Link>
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-baseline justify-between rounded-full px-4 py-2.5 text-[16px] ${
              active ? "bg-pill-deep font-bold" : "font-medium text-muted"
            }`}
          >
            {item.label}
            <span className="text-[12px] font-medium text-faint">{item.hint}</span>
          </Link>
        );
      })}
    </nav>
  );
}
