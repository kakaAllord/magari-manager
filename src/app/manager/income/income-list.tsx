import { cargoLine, formatDate, formatDateTime, formatMoney } from "@/lib/format";
import type { Income } from "@/lib/incomes";
import { DeleteIncome } from "./delete-income";

export function IncomeList({ incomes, empty }: { incomes: Income[]; empty: string }) {
  if (incomes.length === 0) return <p className="py-6 text-center text-sm text-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-line">
      {incomes.map((i) => (
        <li key={i.id} className="grid gap-2 py-3.5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-medium break-words">
                {i.source}
                {i.car && <span className="font-normal text-muted"> · {i.car}</span>}
              </p>
              {cargoLine(i) && <p className="text-sm break-words">{cargoLine(i)}</p>}
              {i.description && <p className="text-sm break-words">{i.description}</p>}
              {i.duplicate_amount !== null && i.duplicate_at !== null && (
                <p className="mt-1 text-xs">
                  <span className="rounded bg-warn-soft px-1.5 py-px font-medium text-warn">Huenda ni marudio</span>{" "}
                  <span className="text-muted">
                    ya {formatMoney(i.duplicate_amount)} la {formatDateTime(i.duplicate_at)}
                  </span>
                </p>
              )}
              <p className="mt-1 text-xs text-muted">
                {i.backfilled_at ? (
                  <>
                    {formatDate(i.created_at)} · <span className="font-medium text-warn">Rekodi ya zamani</span>,
                    imeingizwa na {i.recorder_name ?? "meneja"} {formatDateTime(i.backfilled_at)}
                  </>
                ) : (
                  <>
                    {formatDateTime(i.created_at)} · Imerekodiwa na {i.recorder_name ?? "meneja"}
                  </>
                )}
              </p>
            </div>
            <p className="shrink-0 font-semibold text-ok tabular-nums">+{formatMoney(i.amount)}</p>
          </div>
          {i.can_delete && <DeleteIncome incomeId={i.id} source={i.source} />}
        </li>
      ))}
    </ul>
  );
}
