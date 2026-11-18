"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { NavLink } from "./app-shell";
import { Icon } from "./icons";
import { useT } from "./lang-provider";

// The first link is the section home, so it only matches exactly.
function useIsActive(links: NavLink[]) {
  const pathname = usePathname();
  const home = links[0]?.href;
  return (href: string) => (href === home ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));
}

// Runs of links that share a group heading, in the order the nav file gives them. Links without a
// group (the top of the list) come under no heading.
function grouped(links: NavLink[]) {
  const runs: { group?: string; links: NavLink[] }[] = [];
  for (const l of links) {
    const last = runs.at(-1);
    if (last && last.group === l.group) last.links.push(l);
    else runs.push({ group: l.group, links: [l] });
  }
  return runs;
}

// Open/closed state that remembers the page it was opened on, so following a link closes it.
function useOpenOnThisPage() {
  const pathname = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const setOpen = useCallback((open: boolean) => setOpenOn(open ? pathname : null), [pathname]);
  return [openOn === pathname, setOpen] as const;
}

const groupHeading = "px-3 pb-1 text-[11px] font-semibold tracking-wider text-muted/80 uppercase";

// Desktop: a vertical list in the sidebar, in small labelled groups.
export function SideLinks({ links }: { links: NavLink[] }) {
  const isActive = useIsActive(links);
  return (
    <nav className="grid gap-4">
      {grouped(links).map((run, i) => (
        <div key={run.group ?? i} className="grid gap-0.5">
          {run.group && <p className={groupHeading}>{run.group}</p>}
          {run.links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className="group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-background hover:text-foreground aria-[current=page]:bg-accent-soft aria-[current=page]:font-medium aria-[current=page]:text-accent"
            >
              <span className="absolute inset-y-2 -left-4 w-1 rounded-r-full bg-accent opacity-0 group-aria-[current=page]:opacity-100" />
              <Icon name={l.icon} className="size-[18px]" />
              {l.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}

// Desktop: the signed-in person at the foot of the sidebar. A tap opens a small menu above it with
// the account page, the language and sign out (rendered on the server and passed in as children).
export function AccountMenu({ name, detail, initials, children }: { name: string; detail: string; initials: string; children: React.ReactNode }) {
  const t = useT();
  const wrapper = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useOpenOnThisPage();
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !wrapper.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open, setOpen]);

  return (
    <div ref={wrapper} className="relative">
      {open && (
        <div role="menu" className="absolute inset-x-0 bottom-full z-30 mb-2 grid gap-0.5 rounded-xl border border-line bg-surface p-1 shadow-lg">
          {children}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={t("Akaunti, lugha na kutoka", "Account, language and sign out")}
        className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-background aria-expanded:bg-background"
      >
        <Avatar initials={initials} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{name}</span>
          <span className="block truncate text-xs text-muted">{detail}</span>
        </span>
        <Icon name="chevrons" className="size-4 shrink-0 text-muted" />
      </button>
    </div>
  );
}

export function Avatar({ initials, className = "size-9 text-sm" }: { initials: string; className?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-full bg-accent-soft font-semibold text-accent ${className}`}>
      {initials}
    </span>
  );
}

// Phones and tablets: a bar along the bottom with the links marked `tab` (four at most) and Zaidi,
// which opens a sheet with every other link plus `children` (account, language, sign out).
export function BottomBar({ links, header, children }: { links: NavLink[]; header: React.ReactNode; children: React.ReactNode }) {
  const t = useT();
  const isActive = useIsActive(links);
  const pathname = usePathname();
  const [open, setOpen] = useOpenOnThisPage();
  const sheet = useRef<HTMLDialogElement>(null);

  const tabs = links.filter((l) => l.tab).slice(0, 4);
  const rest = links.filter((l) => !tabs.includes(l));
  const moreActive = rest.some((l) => isActive(l.href)) || pathname.startsWith("/account");

  useEffect(() => {
    const d = sheet.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const tabClass =
    "group flex min-w-0 flex-1 flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] leading-tight text-muted aria-[current=page]:font-semibold aria-[current=page]:text-accent";
  const iconPill = "grid h-7 w-12 place-items-center rounded-full transition-colors group-aria-[current=page]:bg-accent-soft";

  return (
    <>
      <nav
        data-bottom-bar
        aria-label={t("Kurasa", "Pages")}
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur lg:hidden"
      >
        {tabs.map((l) => (
          <Link key={l.href} href={l.href} aria-current={isActive(l.href) ? "page" : undefined} className={tabClass}>
            <span className={iconPill}>
              <Icon name={l.icon} className="size-5" />
            </span>
            <span className="max-w-full truncate px-1">{l.short ?? l.label}</span>
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-current={moreActive ? "page" : undefined}
          className={tabClass}
        >
          <span className={iconPill}>
            <Icon name="grid" className="size-5" />
          </span>
          <span>{t("Zaidi", "More")}</span>
        </button>
      </nav>

      <dialog
        ref={sheet}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        aria-label={t("Zaidi", "More")}
        className="m-0 mt-auto max-h-[85dvh] w-full overflow-y-auto overscroll-contain max-w-full rounded-t-3xl bg-surface p-0 text-foreground shadow-xl backdrop:bg-black/40 sm:mx-auto sm:max-w-lg lg:hidden"
      >
        <div className="grid gap-4 px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          <span className="mx-auto h-1 w-10 rounded-full bg-line" aria-hidden="true" />
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">{header}</div>
            <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost size-11 shrink-0 rounded-full p-0" aria-label={t("Funga", "Close")}>
              <Icon name="close" className="size-4" />
            </button>
          </div>
          {grouped(rest).map((run, i) => (
            <section key={run.group ?? i} className="grid gap-2">
              {run.group && <h2 className={`${groupHeading} px-1`}>{run.group}</h2>}
              <div className="grid grid-cols-3 gap-2">
                {run.links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    aria-current={isActive(l.href) ? "page" : undefined}
                    className="flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-2xl border border-line bg-background px-2 py-2.5 text-center text-xs font-medium leading-tight aria-[current=page]:border-accent aria-[current=page]:bg-accent-soft aria-[current=page]:text-accent"
                  >
                    <Icon name={l.icon} className="size-5" />
                    {l.label}
                  </Link>
                ))}
              </div>
            </section>
          ))}
          <div className="grid gap-1 rounded-2xl border border-line p-1">{children}</div>
        </div>
      </dialog>
    </>
  );
}
