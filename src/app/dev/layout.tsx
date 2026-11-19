import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { stopImpersonating } from "@/app/actions/dev";
import { en } from "@/lib/i18n";
import { homeFor, requireDev, roleName } from "@/lib/session";
import { DevNav } from "./dev-nav";

// The hidden developer area. requireDev lets only the dev account in (everyone else gets a 404) and
// works even while impersonating, since it reads the real session owner. Deliberately dark, English
// and terminal-like, so it can never be confused with the staff app.
export default async function DevLayout({ children }: { children: React.ReactNode }) {
  const session = await requireDev();
  const viewing = session.impersonating ? session.user : null;

  return (
    <div className="relative flex min-h-dvh flex-1 flex-col bg-[#07090b] font-mono text-[#c9d1d9] selection:bg-[#7ee787]/30">
      {/* A faint glow and scanlines, like an old phosphor screen. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(126,231,135,0.10), transparent 60%), repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 3px)",
        }}
      />
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#07090b]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link href="/dev" className="flex items-center gap-2 text-sm font-semibold tracking-tight text-[#e6edf3]">
            <span className="grid size-7 place-items-center rounded-md bg-[#7ee787]/10 text-[#7ee787] ring-1 ring-[#7ee787]/30">~</span>
            <span>
              zuraja<span className="text-[#7ee787]">://</span>dev
              <span className="dev-cursor ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 bg-[#7ee787]" />
            </span>
          </Link>
          <DevNav />
          <div className="ml-auto flex items-center gap-3 text-xs">
            <span className="hidden text-[#6e7681] sm:inline">{session.owner.name}</span>
            <form action={logout}>
              <button type="submit" className="rounded-md px-2 py-1 text-[#8b949e] ring-1 ring-white/10 transition hover:bg-white/5 hover:text-[#e6edf3]">
                exit
              </button>
            </form>
          </div>
        </div>
        {viewing && (
          <div className="border-t border-[#e3b341]/20 bg-[#e3b341]/[0.07]">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 text-xs">
              <span className="flex items-center gap-2 text-[#e3b341]">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#e3b341] opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-[#e3b341]" />
                </span>
                viewing as <b className="text-[#f0d58c]">{viewing.name}</b>
                <span className="text-[#e3b341]/70">· {roleName(viewing.role, en)} · read-only</span>
              </span>
              <span className="ml-auto flex gap-2">
                <Link href={homeFor(viewing.role)} className="rounded-md bg-[#e3b341] px-2.5 py-1 font-semibold text-[#1a1406] hover:brightness-110">
                  open their view →
                </Link>
                <form action={stopImpersonating}>
                  <button type="submit" className="rounded-md px-2.5 py-1 text-[#e3b341] ring-1 ring-[#e3b341]/40 hover:bg-[#e3b341]/10">
                    stop
                  </button>
                </form>
              </span>
            </div>
          </div>
        )}
      </header>
      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
