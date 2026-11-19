import { listAllUsers } from "@/lib/dev";
import { requireDev } from "@/lib/session";
import { UserList } from "./user-list";

export const dynamic = "force-dynamic";

export default async function DevConsole({ searchParams }: PageProps<"/dev">) {
  const session = await requireDev();
  const users = await listAllUsers();
  const blocked = (await searchParams).blocked === "1";
  const viewingId = session.impersonating ? session.user.id : null;

  const staff = users.filter((u) => u.role !== "driver" && u.role !== "dev").length;
  const drivers = users.filter((u) => u.role === "driver").length;
  const active = users.filter((u) => u.signed_in_secs_ago !== null && u.signed_in_secs_ago < 86400).length;

  return (
    <div className="space-y-6">
      {blocked && (
        <p role="alert" className="rounded-lg border border-[#ff7b72]/30 bg-[#ff7b72]/[0.07] px-4 py-3 text-sm text-[#ffa198]">
          <span className="font-semibold text-[#ff7b72]">✗ write blocked</span> — viewing as someone is read-only, so nothing was saved.
          Stop viewing to act as yourself.
        </p>
      )}

      <section>
        <p className="text-xs text-[#6e7681]">
          <span className="text-[#7ee787]">$</span> select * from users
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-[#e6edf3]">Everyone in the app</h1>
        <p className="mt-1 max-w-2xl text-sm text-[#8b949e]">
          Pick a person to see the app exactly as they do. Switching is silent and read-only: you can look anywhere, but nothing you press is
          saved.
        </p>
      </section>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "accounts", value: users.length, tone: "text-[#e6edf3]" },
          { label: "staff", value: staff, tone: "text-[#79c0ff]" },
          { label: "drivers", value: drivers, tone: "text-[#d2a8ff]" },
          { label: "signed in · 24h", value: active, tone: "text-[#7ee787]" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <dt className="text-[11px] tracking-wide text-[#6e7681] uppercase">{s.label}</dt>
            <dd className={`mt-1 text-2xl font-semibold tabular-nums ${s.tone}`}>{s.value}</dd>
          </div>
        ))}
      </dl>

      <UserList viewingId={viewingId} users={users} />
    </div>
  );
}
