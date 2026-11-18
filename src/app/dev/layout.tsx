import Link from "next/link";
import { requireDev } from "@/lib/session";

// The hidden developer area. requireDev lets only the dev account in (everyone else gets a 404) and
// works even while impersonating, since it reads the real session owner. Deliberately plain and
// unlike the staff app, so there's no chance of confusing the two.
export default async function DevLayout({ children }: { children: React.ReactNode }) {
  await requireDev();
  return (
    <div className="min-h-full bg-foreground text-background">
      <header className="border-b border-white/10 px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/dev" className="font-mono text-sm font-semibold tracking-wide">
            dev console
          </Link>
          <span className="font-mono text-xs text-background/50">Zuraja</span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}
