"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import type { NavLink } from "./app-shell";
import { Icon } from "./icons";

function useIsActive() {
  const pathname = usePathname();
  // The first link is the section home, so it only matches exactly.
  return (href: string, i: number) =>
    i === 0 ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

// Phones and tablets: a row of tabs under the top bar that scrolls sideways if needed. The current tab
// is scrolled into view, so pages further along (Madereva, Wafanyakazi) don't open with it hidden.
export function TabLinks({ links }: { links: NavLink[] }) {
  const isActive = useIsActive();
  const pathname = usePathname();
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    const n = nav.current;
    const tab = n?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!n || !tab) return;
    if (tab.offsetLeft < n.scrollLeft || tab.offsetLeft + tab.offsetWidth > n.scrollLeft + n.clientWidth) {
      n.scrollLeft = tab.offsetLeft - (n.clientWidth - tab.offsetWidth) / 2;
    }
  }, [pathname]);
  return (
    <nav ref={nav} className="relative -mb-px flex gap-1 overflow-x-auto px-2 text-sm [scrollbar-width:none]">
      {links.map((l, i) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={isActive(l.href, i) ? "page" : undefined}
          className="flex shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3 py-3 text-muted hover:text-foreground aria-[current=page]:border-accent aria-[current=page]:font-medium aria-[current=page]:text-foreground"
        >
          <Icon name={l.icon} className="size-4" />
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

// Desktop: a vertical list in the sidebar.
export function SideLinks({ links }: { links: NavLink[] }) {
  const isActive = useIsActive();
  return (
    <nav className="grid gap-1">
      {links.map((l, i) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={isActive(l.href, i) ? "page" : undefined}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted hover:bg-background hover:text-foreground aria-[current=page]:bg-accent-soft aria-[current=page]:font-medium aria-[current=page]:text-accent"
        >
          <Icon name={l.icon} />
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
