import { logout } from "@/app/actions/auth";
import { COMPANY, COMPANY_SHORT } from "@/lib/company";
import { getT } from "@/lib/lang";
import { roleName, type User } from "@/lib/session";
import Link from "next/link";
import { BrandMark, Icon, type IconName } from "./icons";
import { LangSwitch } from "./lang-switch";
import { AccountMenu, Avatar, BottomBar, SideLinks } from "./nav-links";

type Pair = [sw: string, en: string];
export type NavLink = { href: string; label: string; icon: IconName; group?: string; tab?: boolean; short?: string };
// The nav files give each label in both languages; the shell picks one before the links reach the browser.
// `group` heads a run of links in the sidebar and the phone's Zaidi sheet; `tab` puts a link on the phone's
// bottom bar (four at most), under `short` if the full label is too long for it.
export type NavItem = { href: string; label: Pair; icon: IconName; group?: Pair; tab?: boolean; short?: Pair };

// Desktop (lg and up): fixed sidebar with grouped links and an account menu at its foot.
// Phones and tablets: a slim top bar, and a bottom bar with the main pages plus Zaidi for the rest.
export async function AppShell({ user, links: items, children }: { user: User; links: NavItem[]; children: React.ReactNode }) {
  const t = await getT();
  const links: NavLink[] = items.map((l) => ({
    ...l,
    label: t(...l.label),
    group: l.group && t(...l.group),
    short: l.short && t(...l.short),
  }));
  const initials = user.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const role = roleName(user.role, t);

  const row = "flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm hover:bg-background sm:min-h-9";
  // The same three actions in the desktop menu and the phone sheet.
  const accountActions = (
    <>
      <Link href="/account" role="menuitem" className={row}>
        <Icon name="key" className="size-4 text-muted" />
        {t("Akaunti na nenosiri", "Account and password")}
      </Link>
      <LangSwitch variant="row" />
      <div className="mx-2 my-0.5 border-t border-line" />
      <form action={logout}>
        <button type="submit" role="menuitem" className={`${row} text-danger`}>
          <Icon name="logout" className="size-4" />
          {t("Toka", "Sign out")}
        </button>
      </form>
    </>
  );

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex items-center gap-3 px-6 pt-5 pb-4">
          <BrandMark />
          <div className="min-w-0">
            <p className="text-sm leading-tight font-semibold">{COMPANY}</p>
            <p className="text-xs text-muted">{t("Usimamizi wa magari", "Fleet management")}</p>
          </div>
        </div>
        {/* Scrolls on its own if a short screen can't hold every link, so the account stays in view. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2 [scrollbar-width:thin]">
          <SideLinks links={links} />
        </div>
        <div className="border-t border-line p-3">
          <AccountMenu name={user.name} detail={role} initials={initials}>
            {accountActions}
          </AccountMenu>
        </div>
      </aside>

      {/* Top bar */}
      <header className="sticky top-[env(safe-area-inset-top,0px)] z-20 border-b border-line bg-surface/90 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <BrandMark className="size-9" />
          <div className="min-w-0 flex-1">
            {/* Wraps rather than cut off on the narrowest phones: the name is what a client looks for. */}
            <p className="leading-tight font-semibold">{COMPANY_SHORT}</p>
            <p className="truncate text-xs text-muted">
              {user.name} · {role}
            </p>
          </div>
        </div>
      </header>

      <BottomBar
        links={links}
        header={
          <div className="flex items-center gap-3">
            <Avatar initials={initials} className="size-11 text-base" />
            <div className="min-w-0">
              <p className="truncate font-semibold">{user.name}</p>
              <p className="truncate text-sm text-muted">{role}</p>
            </div>
          </div>
        }
      >
        {accountActions}
      </BottomBar>

      {/* On phones the bottom bar covers the last 4rem, so pages end above it. */}
      <div className="flex flex-1 flex-col max-lg:pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pl-64">{children}</div>
    </div>
  );
}
