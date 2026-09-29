import Link from "next/link";
import { logout } from "@/app/actions/auth";
import type { User } from "@/lib/session";

export function Header({ user, links }: { user: User; links: { href: string; label: string }[] }) {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <span className="font-semibold">Car Manager</span>
        <nav className="flex gap-4 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-muted hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="text-muted">
            {user.name} · <span className="capitalize">{user.role}</span>
          </span>
          <form action={logout}>
            <button type="submit" className="btn btn-ghost">
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
