import { getT } from "@/lib/lang";
import { StaffMenu } from "@/components/staff-forms";
import { query } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { staffLabel, type StaffRole } from "@/lib/staff";

type StaffRow = {
  id: number;
  name: string;
  email: string;
  role: StaffRole;
  added_by: string | null;
  handled: number;
  last_active: Date | null;
  deactivated_at: Date | null;
};

const roleBadge: Record<StaffRole, string> = {
  factory_manager: "bg-ok-soft text-ok",
  manager: "bg-accent-soft text-accent",
  accountant: "bg-warn-soft text-warn",
};


// Staff in `roles`, in that order, switched-off people last, each with a ⋯ menu for a new password
// or switching them off.
export async function StaffList({ roles, empty }: { roles: StaffRole[]; empty: string }) {
  // "Last active" is the latest decision, payment or income recorded.
  const staff = await query<StaffRow>(
    `SELECT u.id, u.name, u.email, u.role, u.deactivated_at, a.name AS added_by,
            CASE u.role
              WHEN 'manager' THEN (SELECT count(*)::int FROM money_requests r WHERE r.reviewed_by = u.id AND r.requester_id <> u.id)
              WHEN 'factory_manager' THEN (SELECT count(*)::int FROM money_requests r WHERE r.factory_reviewed_by = u.id)
              ELSE (SELECT count(*)::int FROM money_requests r WHERE r.issued_by = u.id)
            END AS handled,
            greatest(
              (SELECT max(coalesce(backfilled_at, reviewed_at)) FROM money_requests r WHERE r.reviewed_by = u.id),
              (SELECT max(factory_reviewed_at) FROM money_requests r WHERE r.factory_reviewed_by = u.id),
              (SELECT max(issued_at) FROM money_requests r WHERE r.issued_by = u.id),
              (SELECT max(coalesce(backfilled_at, created_at)) FROM incomes i WHERE i.recorded_by = u.id)
            ) AS last_active
       FROM users u LEFT JOIN users a ON a.id = u.added_by
      WHERE u.role = ANY($1::text[])
      ORDER BY u.deactivated_at IS NOT NULL, array_position($1::text[], u.role), u.name`,
    [roles],
  );
  const inactive = staff.filter((m) => m.deactivated_at).length;
  const t = await getT();
  // What "handled" counts for each role: requests decided, authorised or paid.
  const handledLabel: Record<StaffRole, string> = {
    factory_manager: t("Ameamua maombi", "Requests decided"),
    manager: t("Ameamua maombi", "Requests decided"),
    accountant: t("Amelipa maombi", "Requests paid"),
  };

  return (
    <section className="card p-0 sm:p-0">
      <h2 className="border-b border-line px-4 py-3 text-sm font-medium text-muted sm:px-5">
        {t(`Wafanyakazi ${staff.length}`, `${staff.length} staff`)}
        {inactive > 0 && t(` · ${inactive} wamezimwa`, ` · ${inactive} switched off`)}
      </h2>
      {staff.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-line">
          {staff.map((m) => (
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
                  {roles.length > 1 && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleBadge[m.role]}`}>
                      {staffLabel(m.role, t)}
                    </span>
                  )}
                  {m.deactivated_at && (
                    <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">
                      {t("Amezimwa", "Switched off")}
                    </span>
                  )}
                </p>
                <p className="truncate text-sm text-muted">
                  {m.email}
                  {m.added_by && <span className="text-xs"> · {t(`ameongezwa na ${m.added_by}`, `added by ${m.added_by}`)}</span>}
                </p>
                <p className="text-xs text-muted">
                  {m.deactivated_at
                    ? t(`Alizimwa ${formatDateTime(m.deactivated_at)}`, `Switched off ${formatDateTime(m.deactivated_at)}`)
                    : `${handledLabel[m.role]} ${m.handled}${m.last_active ? t(` · mara ya mwisho ${formatDateTime(m.last_active)}`, ` · last active ${formatDateTime(m.last_active)}`) : ""}`}
                </p>
              </div>
              <StaffMenu id={m.id} name={m.name} active={!m.deactivated_at} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
