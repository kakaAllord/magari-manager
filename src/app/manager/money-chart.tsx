import { formatCompact, formatMoney } from "@/lib/format";

type Point = { label: string; income: string; spend: string };

// Rounds up to 1, 2 or 5 × 10^n so gridlines land on readable values.
function niceMax(value: number) {
  if (value <= 0) return 100_000;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((m) => m * power >= value) ?? 10;
  return step * power;
}

// Keep tooltips at the edges inside the chart.
const tooltipAnchor = (i: number, count: number) =>
  i === 0 ? "left-0" : i === count - 1 ? "right-0" : "left-1/2 -translate-x-1/2";

const bar = (value: number, max: number) => ({ height: value > 0 ? `max(${(value / max) * 100}%, 2px)` : 0 });

// Income and spend side by side for each month, oldest first.
export function MoneyChart({ data }: { data: Point[] }) {
  const points = data.map((d) => ({ label: d.label, income: Number(d.income), spend: Number(d.spend) }));
  const max = niceMax(Math.max(...points.flatMap((p) => [p.income, p.spend])));
  const ticks = [max, max / 2, 0];

  return (
    <figure className="grid gap-2">
      <figcaption className="flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-ok" aria-hidden="true" /> Mapato
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-muted" aria-hidden="true" /> Matumizi
        </span>
      </figcaption>
      <div className="grid grid-cols-[auto_1fr] gap-x-2">
        {/* y axis labels */}
        <div className="relative h-44 w-10 text-right text-[11px] text-muted tabular-nums">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - (t / max) * 100}%` }}>
              {formatCompact(t)}
            </span>
          ))}
        </div>
        {/* plot */}
        <div className="relative h-44">
          {ticks.map((t) => (
            <div
              key={t}
              className={`absolute inset-x-0 border-t ${t === 0 ? "border-muted/60" : "border-line"}`}
              style={{ top: `${100 - (t / max) * 100}%` }}
            />
          ))}
          <ol className="absolute inset-0 flex items-end gap-2 px-1 sm:gap-4">
            {points.map((p, i) => (
              <li
                key={p.label}
                tabIndex={0}
                aria-label={`${p.label}: mapato ${formatMoney(p.income)}, matumizi ${formatMoney(p.spend)}`}
                className="group relative flex h-full flex-1 items-end justify-center gap-0.5 rounded outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                <span className="block w-full max-w-5 rounded-t bg-ok group-hover:opacity-80" style={bar(p.income, max)} />
                <span className="block w-full max-w-5 rounded-t bg-muted group-hover:opacity-80" style={bar(p.spend, max)} />
                {/* tooltip: hover, or tap/focus on phones */}
                <span
                  role="tooltip"
                  className={`pointer-events-none absolute bottom-full z-10 mb-1 hidden rounded-md ${tooltipAnchor(i, points.length)} border border-line bg-surface px-2 py-1 text-xs whitespace-nowrap shadow-sm group-focus-within:block group-hover:block`}
                >
                  <span className="block text-muted">{p.label}</span>
                  <span className="block tabular-nums">
                    Mapato <b className="text-ok">{formatMoney(p.income)}</b>
                  </span>
                  <span className="block tabular-nums">
                    Matumizi <b>{formatMoney(p.spend)}</b>
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        {/* x axis labels */}
        <div />
        <ol className="flex gap-2 px-1 pt-1 text-[11px] text-muted sm:gap-4">
          {points.map((p) => (
            <li key={p.label} className="flex-1 text-center">
              {p.label.slice(0, 3)}
            </li>
          ))}
        </ol>
      </div>
    </figure>
  );
}
