import Link from "next/link";
import { cargoLine, formatDate, formatDateTime, formatMoney } from "@/lib/format";
import type { Income } from "@/lib/incomes";
import { DeleteIncome } from "./delete-income";

// `action` takes the place of Futa, such as the button to record a payment on a debt.
export function IncomeList({
  incomes,
  empty,
  action,
}: {
  incomes: Income[];
  empty: string;
  action?: (income: Income) => React.ReactNode;
}) {
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
              {i.invoice_id !== null ? (
                <p className="text-sm">
                  <Link href={`/manager/invoices/${i.invoice_id}`} className="font-medium text-accent underline">
                    Ankara {i.invoice_number}
                  </Link>
                </p>
              ) : (
                i.description && <p className="text-sm break-words">{i.description}</p>
              )}
              <DebtLines income={i} />
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
          {action ? action(i) : i.can_delete && <DeleteIncome incomeId={i.id} source={i.source} />}
        </li>
      ))}
    </ul>
  );
}

// For income taken on credit: the client, what is still owed (or that it's cleared) and each payment.
function DebtLines({ income: i }: { income: Income }) {
  if (i.customer_name === null) return null;
  const owed = Number(i.amount) - Number(i.amount_paid);
  return (
    <div className="mt-1 grid gap-0.5 text-sm">
      <p className="break-words">
        {owed > 0 ? (
          <span className="rounded bg-warn-soft px-1.5 py-px text-xs font-medium text-warn">Deni {formatMoney(owed)}</span>
        ) : (
          <span className="rounded bg-ok-soft px-1.5 py-px text-xs font-medium text-ok">Deni limelipwa</span>
        )}{" "}
        {i.customer_name}
        {owed > 0 && <span className="text-muted"> · amelipa {formatMoney(i.amount_paid)}</span>}
      </p>
      {i.payments.map((p, n) => (
        <p key={n} className="text-xs text-muted">
          {formatDateTime(new Date(p.paid_at))} · {formatMoney(p.amount)}
          {p.note && ` · ${p.note}`}
          {p.recorder_name && ` · alipokea ${p.recorder_name}`}
        </p>
      ))}
    </div>
  );
}
