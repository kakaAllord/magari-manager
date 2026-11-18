import Link from "next/link";
import { impersonate, stopImpersonating } from "@/app/actions/dev";
import { listAllUsers, type DevUser } from "@/lib/dev";
import { en } from "@/lib/i18n";
import { homeFor, requireDev, roleName } from "@/lib/session";

export const dynamic = "force-dynamic";

const label = (u: DevUser) => (u.role === "driver" ? (u.plate ?? "no car") : (u.email ?? "—"));

export default async function DevConsole() {
  const session = await requireDev();
  const users = await listAllUsers();
  const viewing = session.impersonating ? session.user : null;

  return (
    <div className="space-y-6">
      {viewing ? (
        <section className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-4">
          <p className="text-xs tracking-wide text-amber-200/80 uppercase">Currently viewing as</p>
          <p className="mt-1 text-lg font-semibold">
            {viewing.name} <span className="font-normal text-background/60">· {roleName(viewing.role, en)}</span>
          </p>
          <p className="mt-1 text-sm text-background/60">
            The app shows this person&apos;s own view. They are not told and cannot tell. Anything you do is recorded as them.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={homeFor(viewing.role)} className="rounded-lg bg-background px-3 py-2 text-sm font-medium text-foreground">
              Open their view
            </Link>
            <form action={stopImpersonating}>
              <button type="submit" className="rounded-lg border border-white/20 px-3 py-2 text-sm font-medium hover:bg-white/10">
                Stop
              </button>
            </form>
          </div>
        </section>
      ) : (
        <section>
          <h1 className="text-lg font-semibold">All users</h1>
          <p className="mt-1 text-sm text-background/60">Pick a person to view the app exactly as they see it. Switching is silent.</p>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-white/10 last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">
                    {u.name}
                    {u.off && <span className="ml-2 rounded bg-white/10 px-1.5 py-px text-xs text-background/60">off</span>}
                    {viewing?.id === u.id && <span className="ml-2 rounded bg-amber-400/20 px-1.5 py-px text-xs text-amber-200">viewing</span>}
                  </p>
                  <p className="font-mono text-xs text-background/50">
                    {roleName(u.role, en)} · {label(u)}
                  </p>
                </td>
                <td className="px-4 py-3 text-right">
                  {u.role === "dev" ? (
                    <span className="font-mono text-xs text-background/40">you</span>
                  ) : (
                    <form action={impersonate}>
                      <input type="hidden" name="userId" value={u.id} />
                      <button type="submit" className="rounded-lg bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:opacity-90">
                        View as
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
