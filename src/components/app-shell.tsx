import { logout } from "@/app/actions/auth";
import type { User } from "@/lib/session";
import { BrandMark, Icon, type IconName } from "./icons";
import { SideLinks, TabLinks } from "./nav-links";

export type NavLink = { href: string; label: string; icon: IconName };

const roleName = { driver: "Dereva", manager: "Meneja" } as const;

// Desktop (lg and up): fixed sidebar. Phones and tablets: top bar with tabs.
export function AppShell({ user, links, children }: { user: User; links: NavLink[]; children: React.ReactNode }) {
  const initials = user.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const logoutButton = (full: boolean) => (
    <form action={logout} className={full ? "w-full" : undefined}>
      <button type="submit" className={`btn btn-ghost gap-2 ${full ? "w-full justify-start" : ""}`} aria-label="Toka">
        <Icon name="logout" className="size-4" />
        <span className={full ? undefined : "max-sm:sr-only"}>Toka</span>
      </button>
    </form>
  );

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-line bg-surface px-4 py-5 lg:flex">
        <div className="flex items-center gap-3 px-2">
          <BrandMark />
          <div>
            <p className="font-semibold leading-tight">Magari</p>
            <p className="text-xs text-muted">Usimamizi wa magari</p>
          </div>
        </div>
        <div className="mt-8 flex-1">
          <SideLinks links={links} />
        </div>
        <div className="grid gap-3 border-t border-line pt-4">
          <div className="flex items-center gap-3 px-1">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted">{roleName[user.role]}</p>
            </div>
          </div>
          {logoutButton(true)}
        </div>
      </aside>

      {/* Top bar */}
      <header className="sticky top-[env(safe-area-inset-top,0px)] z-20 border-b border-line bg-surface/90 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          <BrandMark className="size-9" />
          <div className="min-w-0 flex-1">
            <p className="leading-tight font-semibold">Magari</p>
            <p className="truncate text-xs text-muted">
              {user.name} · {roleName[user.role]}
            </p>
          </div>
          {logoutButton(false)}
        </div>
        {links.length > 1 && <TabLinks links={links} />}
      </header>

      <div className="flex flex-1 flex-col lg:pl-64">{children}</div>
    </div>
  );
}
