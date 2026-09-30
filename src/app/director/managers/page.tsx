import { PageHeader } from "@/components/page-header";
import { query } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { AddManagerForm, ManagerActiveForm, SetManagerPasswordForm } from "./manager-forms";

type StaffRow = {
  id: number;
  name: string;
  email: string;
  role: "manager" | "accountant";
  handled: number;
  last_active: Date | null;
  deactivated_at: Date | null;
};

export default async function ManagersPage() {
  await requireUser("director");
  // "Handled" is requests decided (manager) or paid (mhasibu). "Last active" is the latest of those,
  // or income recorded.
  const managers = await query<StaffRow>(
    `SELECT u.id, u.name, u.email, u.role, u.deactivated_at,
            CASE WHEN u.role = 'manager'
                 THEN (SELECT count(*)::int FROM money_requests r WHERE r.reviewed_by = u.id AND r.requester_id <> u.id)
                 ELSE (SELECT count(*)::int FROM money_requests r WHERE r.issued_by = u.id)
            END AS handled,
            greatest(
              (SELECT max(reviewed_at) FROM money_requests r WHERE r.reviewed_by = u.id),
              (SELECT max(issued_at) FROM money_requests r WHERE r.issued_by = u.id),
              (SELECT max(created_at) FROM incomes i WHERE i.recorded_by = u.id)
            ) AS last_active
       FROM users u WHERE u.role IN ('manager', 'accountant')
      ORDER BY u.deactivated_at IS NOT NULL, u.role DESC, u.name`,
  );

  return (
    <main className="page">
      <PageHeader
        title="Wafanyakazi"
        description="Mameneja na wahasibu wanaingia kwa barua pepe na nenosiri unaloweka hapa. Ukimzima mtu, hataweza kuingia lakini jina lake linabaki kwenye historia."
      />

      <section className="card">
        <h2 className="mb-4 text-lg font-semibold">Ongeza mfanyakazi</h2>
        <AddManagerForm />
      </section>

      <section className="card">
        <h2 className="mb-2 text-lg font-semibold">
          Wafanyakazi wote <span className="text-muted">({managers.length})</span>
        </h2>
        {managers.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Bado hakuna mfanyakazi. Ongeza wa kwanza hapo juu.</p>
        ) : (
          <ul className="divide-y divide-line">
            {managers.map((m) => (
              <li key={m.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_minmax(0,22rem)] sm:items-center">
                <div className={`flex min-w-0 items-center gap-3 ${m.deactivated_at ? "opacity-60" : ""}`}>
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                    {m.name
                      .split(/\s+/)
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {m.name}
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                        {m.role === "manager" ? "Meneja" : "Mhasibu"}
                      </span>
                      {m.deactivated_at && (
                        <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">
                          Amezimwa
                        </span>
                      )}
                    </p>
                    <p className="truncate text-sm text-muted">{m.email}</p>
                    <p className="text-xs text-muted">
                      {m.role === "manager" ? "Ameamua maombi" : "Amelipa maombi"} {m.handled}
                      {m.last_active && ` · Mara ya mwisho ${formatDateTime(m.last_active)}`}
                    </p>
                  </div>
                </div>
                {m.deactivated_at ? (
                  <div className="grid gap-1 sm:justify-items-end">
                    <p className="text-xs text-muted">Alizimwa {formatDateTime(m.deactivated_at)}</p>
                    <ManagerActiveForm managerId={m.id} managerName={m.name} active={false} />
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <SetManagerPasswordForm managerId={m.id} managerName={m.name} />
                    <ManagerActiveForm managerId={m.id} managerName={m.name} active />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
