import Link from "next/link";

/**
 * Sticky header shared by every section page. The left slot is either a back link
 * or the `todo` wordmark (home, i.e. Hoy); the rail on laptops carries the
 * wordmark already, so there it's hidden unless it's a back link.
 */
export default function PageHeader({
  title,
  back,
  aside,
  children,
}: {
  title?: string;
  back?: { href: string; label: string };
  aside?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 bg-shell px-4 pt-[calc(12px+env(safe-area-inset-top))] pb-3">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        {back ? (
          <Link
            href={back.href}
            className="justify-self-start text-[14px] font-bold text-muted"
          >
            ← {back.label}
          </Link>
        ) : (
          <Link
            href="/"
            className="justify-self-start text-[20px] leading-none font-bold lg:invisible"
          >
            todo
          </Link>
        )}
        <span className="text-[17px] font-bold">{title}</span>
        <div className="justify-self-end text-[12px] font-bold text-faint">
          {aside}
        </div>
      </div>
      {children}
    </header>
  );
}
