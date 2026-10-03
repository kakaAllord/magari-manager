import { PageHeader } from "@/components/page-header";
import { query } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { AddStaff, StaffMenu } from "./manager-forms";

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
              (SELECT max(coalesce(backfilled_at, reviewed_at)) FROM money_requests r WHERE r.reviewed_by = u.id),
              (SELECT max(issued_at) FROM money_requests r WHERE r.issued_by = u.id),
              (SELECT max(coalesce(backfilled_at, created_at)) FROM incomes i WHERE i.recorded_by = u.id)
            ) AS last_active
       FROM users u WHERE u.role IN ('manager', 'accountant')
      ORDER BY u.deactivated_at IS NOT NULL, u.role DESC, u.name`,
  );
  const inactive = managers.filter((m) => m.deactivated_at).length;

  return (
    <main className="page">
      <PageHeader
        title="Wafanyakazi"
        description="Mameneja na wahasibu. Ukimzima mtu hataweza kuingia, lakini jina lake linabaki kwenye historia."
        action={<AddStaff />}
      />

      <section className="card p-0 sm:p-0">
        <h2 className="border-b border-line px-4 py-3 text-sm font-medium text-muted sm:px-5">
          Wafanyakazi {managers.length}
          {inactive > 0 && ` · ${inactive} wamezimwa`}
        </h2>
        {managers.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">Bado hakuna mfanyakazi. Bonyeza “Ongeza mfanyakazi”.</p>
        ) : (
          <ul className="divide-y divide-line">
            {managers.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold ${
                    m.deactivated_at ? "bg-background text-muted" : "bg-accent-soft text-accent"
                  }`}
                >
                  {m.name
                    .split(/\s+/)
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </span>
                <div className={`min-w-0 flex-1 ${m.deactivated_at ? "opacity-60" : ""}`}>
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
                    {m.name}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        m.role === "manager" ? "bg-accent-soft text-accent" : "bg-warn-soft text-warn"
                      }`}
                    >
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
                    {m.deactivated_at
                      ? `Alizimwa ${formatDateTime(m.deactivated_at)}`
                      : `${m.role === "manager" ? "Ameamua maombi" : "Amelipa maombi"} ${m.handled}${
                          m.last_active ? ` · mara ya mwisho ${formatDateTime(m.last_active)}` : ""
                        }`}
                  </p>
                </div>
                <StaffMenu id={m.id} name={m.name} active={!m.deactivated_at} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
