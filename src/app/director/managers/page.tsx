import { PageHeader } from "@/components/page-header";
import { query } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { AddManagerForm, SetManagerPasswordForm } from "./manager-forms";

type ManagerRow = { id: number; name: string; email: string; reviewed: number; last_active: Date | null };

export default async function ManagersPage() {
  await requireUser("director");
  // "Last active" is the latest request decision or income entry the manager made.
  const managers = await query<ManagerRow>(
    `SELECT u.id, u.name, u.email,
            (SELECT count(*)::int FROM money_requests r WHERE r.reviewed_by = u.id) AS reviewed,
            greatest(
              (SELECT max(reviewed_at) FROM money_requests r WHERE r.reviewed_by = u.id),
              (SELECT max(created_at) FROM incomes i WHERE i.recorded_by = u.id)
            ) AS last_active
       FROM users u WHERE u.role = 'manager' ORDER BY u.name`,
  );

  return (
    <main className="page">
      <PageHeader
        title="Mameneja"
        description="Meneja anaingia kwa barua pepe na nenosiri unaloweka hapa."
      />

      <section className="card">
        <h2 className="mb-4 text-lg font-semibold">Ongeza meneja</h2>
        <AddManagerForm />
      </section>

      <section className="card">
        <h2 className="mb-2 text-lg font-semibold">
          Mameneja wote <span className="text-muted">({managers.length})</span>
        </h2>
        {managers.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Bado hakuna meneja. Ongeza wa kwanza hapo juu.</p>
        ) : (
          <ul className="divide-y divide-line">
            {managers.map((m) => (
              <li key={m.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_minmax(0,22rem)] sm:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                    {m.name
                      .split(/\s+/)
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium">{m.name}</p>
                    <p className="truncate text-sm text-muted">{m.email}</p>
                    <p className="text-xs text-muted">
                      Ameshughulikia maombi {m.reviewed}
                      {m.last_active && ` · Mara ya mwisho ${formatDateTime(m.last_active)}`}
                    </p>
                  </div>
                </div>
                <SetManagerPasswordForm managerId={m.id} managerName={m.name} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
