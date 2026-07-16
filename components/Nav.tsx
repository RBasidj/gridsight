"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/map", label: "Map" },
  { href: "/compare", label: "Compare" },
  { href: "/pipeline", label: "Pipeline" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <header className="border-b border-rule-strong bg-paper-raised">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-display text-xl font-bold tracking-tight text-ink">GridSight</span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint sm:inline">
            site suitability
          </span>
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          {LINKS.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={clsx(
                  "border-b-2 pb-0.5 transition-colors",
                  active ? "border-forest text-ink" : "border-transparent text-ink-muted hover:text-ink"
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto hidden font-mono text-[11px] text-ink-faint md:block">TX · ERCOT / NY · NYISO</div>
      </div>
    </header>
  );
}
