import { formatCompact, formatMoney } from "@/lib/format";

type Point = { label: string; total: string };

// Rounds up to 1, 2 or 5 × 10^n so gridlines land on readable values.
function niceMax(value: number) {
  if (value <= 0) return 100_000;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((m) => m * power >= value) ?? 10;
  return step * power;
}

export function SpendChart({ data }: { data: Point[] }) {
  const values = data.map((d) => Number(d.total));
  const max = niceMax(Math.max(...values));
  const ticks = [max, max / 2, 0];
  const last = data.length - 1;

  return (
    <figure className="grid gap-2">
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
            {data.map((d, i) => {
              const value = values[i];
              return (
                <li key={d.label} className="group relative flex h-full flex-1 items-end justify-center">
                  {i === last && value > 0 && (
                    <span
                      className="absolute pb-1 text-[11px] font-medium whitespace-nowrap tabular-nums"
                      style={{ bottom: `${(value / max) * 100}%` }}
                    >
                      {formatCompact(value)}
                    </span>
                  )}
                  <span
                    tabIndex={0}
                    aria-label={`${d.label}: ${formatMoney(value)}`}
                    className="block w-full max-w-10 rounded-t bg-accent outline-none group-hover:opacity-80 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                    style={{ height: value > 0 ? `max(${(value / max) * 100}%, 2px)` : 0 }}
                  />
                  {/* tooltip: hover, or tap/focus on phones */}
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-md border border-line bg-surface px-2 py-1 text-xs whitespace-nowrap shadow-sm group-focus-within:block group-hover:block"
                  >
                    <span className="block text-muted">{d.label}</span>
                    <span className="font-medium tabular-nums">{formatMoney(value)}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
        {/* x axis labels */}
        <div />
        <ol className="flex gap-2 px-1 pt-1 text-[11px] text-muted sm:gap-4">
          {data.map((d) => (
            <li key={d.label} className="flex-1 text-center">
              {d.label.slice(0, 3)}
            </li>
          ))}
        </ol>
      </div>
    </figure>
  );
}
