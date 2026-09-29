import { logout } from "@/app/actions/auth";
import type { User } from "@/lib/session";
import { getTheme } from "@/lib/theme";
import { NavLinks } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

export async function Header({ user, links }: { user: User; links?: { href: string; label: string }[] }) {
  const theme = await getTheme();

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 pt-3 pb-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Car Manager</p>
          <p className="truncate text-xs text-muted">
            {user.name} · <span className="capitalize">{user.role}</span>
          </p>
        </div>
        <ThemeToggle initial={theme} />
        <form action={logout}>
          <button type="submit" className="btn btn-ghost">
            Log out
          </button>
        </form>
      </div>
      {links && (
        <div className="mx-auto max-w-5xl px-1 sm:px-2">
          <NavLinks links={links} />
        </div>
      )}
    </header>
  );
}
