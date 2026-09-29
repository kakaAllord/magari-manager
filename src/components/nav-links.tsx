"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  // The first link is the section home, so it only matches exactly.
  const isActive = (href: string, i: number) =>
    i === 0 ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto text-sm [scrollbar-width:none]">
      {links.map((l, i) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={isActive(l.href, i) ? "page" : undefined}
          className="shrink-0 border-b-2 border-transparent px-3 py-3 text-muted hover:text-foreground aria-[current=page]:border-accent aria-[current=page]:font-medium aria-[current=page]:text-foreground"
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
