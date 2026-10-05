import { formatMoney, keepMinus } from "@/lib/format";

// `plate` is null for money booked without a car (office costs and the like).
export type ProfitRow = { key: string; plate: string | null; sub?: string | null; income: number; spend: number };

const netTone = (net: number) => (net > 0 ? "text-ok" : net < 0 ? "text-danger" : "text-muted");

// Whether each car pays for itself: its income and spending as two bars on one scale, and its faida
// (green) or hasara (red). Best car first. Cars with neither income nor spending are only named, and
// money with no car gets its own line so the total still matches the report.
export function CarProfit({ rows }: { rows: ProfitRow[] }) {
  const cars = rows.filter((r) => r.plate !== null);
  const noCar = rows.find((r) => r.plate === null && (r.income || r.spend));
  const net = (r: ProfitRow) => r.income - r.spend;
  const active = cars
    .filter((c) => c.income || c.spend)
    .sort((a, b) => net(b) - net(a) || a.plate!.localeCompare(b.plate!));
  const idle = cars.filter((c) => !c.income && !c.spend);
  const max = Math.max(1, ...active.flatMap((c) => [c.income, c.spend]));
  const carsNet = active.reduce((s, c) => s + net(c), 0);
  const gaining = active.filter((c) => net(c) > 0).length;
  const losing = active.filter((c) => net(c) < 0).length;

  return (
    <div className="grid gap-3">
      {active.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted">Hakuna mapato wala matumizi ya gari lolote katika kipindi hiki.</p>
      ) : (
        <ul className="divide-y divide-line">
          {active.map((c) => (
            <li key={c.key} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0">
                  <span className="plate">{c.plate}</span>
                  {c.sub && <span className="ml-2 text-xs text-muted">{c.sub}</span>}
                </p>
                <NetFigure net={net(c)} />
              </div>
              <div className="mt-2 grid gap-1.5">
                <Bar label="Mapato" value={c.income} max={max} fill="bg-ok" text="text-ok" />
                <Bar label="Matumizi" value={c.spend} max={max} fill="bg-warn" text="text-foreground" />
              </div>
              <p className="mt-1.5 text-xs text-muted">
                {c.income > 0
                  ? `Matumizi ni ${Math.round((c.spend / c.income) * 100)}% ya mapato`
                  : "Hakuna mapato katika kipindi hiki"}
              </p>
            </li>
          ))}
        </ul>
      )}
      {idle.length > 0 && (
        <p className="text-xs text-muted">
          Bila mapato wala matumizi: {idle.map((c) => c.plate).join(", ")}
        </p>
      )}
      <dl className="grid gap-1 rounded-lg bg-background px-3 py-2.5 text-sm">
        <Line
          label={`Magari: ${gaining} ${gaining === 1 ? "lina" : "yana"} faida · ${losing} ${losing === 1 ? "lina" : "yana"} hasara`}
          value={carsNet}
        />
        {noCar && <Line label="Bila gari (ofisi na mengineyo)" value={net(noCar)} />}
        <Line strong label="Jumla" value={carsNet + (noCar ? net(noCar) : 0)} />
      </dl>
    </div>
  );
}

// "Faida" or "Hasara" as a pill, with the amount under it; a loss shows as a red amount without a minus.
function NetFigure({ net }: { net: number }) {
  const label = net > 0 ? "Faida" : net < 0 ? "Hasara" : "Sawa";
  const pill = net > 0 ? "bg-ok-soft text-ok" : net < 0 ? "bg-danger-soft text-danger" : "bg-background text-muted";
  return (
    <span className="shrink-0 text-right">
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${pill}`}>{label}</span>
      <span className={`mt-1 block font-semibold tabular-nums ${netTone(net)}`}>{formatMoney(Math.abs(net))}</span>
    </span>
  );
}

function Bar({ label, value, max, fill, text }: { label: string; value: number; max: number; fill: string; text: string }) {
  return (
    <div className="grid grid-cols-[3.75rem_1fr_6rem] items-center gap-2 text-xs">
      <span className="text-muted">{label}</span>
      <span className="h-2.5 overflow-hidden rounded-full bg-line">
        <span className={`block h-full rounded-full ${fill}`} style={{ width: `${(value / max) * 100}%` }} />
      </span>
      <span className={`text-right font-medium tabular-nums ${text}`}>{formatMoney(value)}</span>
    </div>
  );
}

function Line({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${strong ? "border-t border-line pt-1 font-semibold" : ""}`}>
      <dt className={strong ? "" : "text-muted"}>{label}</dt>
      <dd className={`shrink-0 tabular-nums ${netTone(value)}`}>{keepMinus(formatMoney(value))}</dd>
    </div>
  );
}
