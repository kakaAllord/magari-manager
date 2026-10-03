"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { Grouping, ReportParams } from "@/lib/report-params";
import type { CarOption } from "@/lib/reports";

type Preset = { label: string; from: string; to: string };

const groupings: { value: Grouping; label: string }[] = [
  { value: "car", label: "Kwa gari" },
  { value: "month", label: "Kwa mwezi" },
  { value: "week", label: "Kwa wiki" },
];

const CUSTOM = "custom";

// One compact row of dropdowns. Picking a period or a grouping shows the report at once; the car
// list and custom dates wait for "Onyesha" so several can be changed together.
export function ReportFilters({
  presets,
  params,
  cars,
  today,
  tab,
}: {
  presets: Preset[];
  params: ReportParams;
  cars: CarOption[];
  today: string;
  tab: "matumizi" | "mapato";
}) {
  const form = useRef<HTMLFormElement>(null);
  const carsMenu = useRef<HTMLDetailsElement>(null);
  const match = presets.findIndex((p) => p.from === params.from && p.to === params.to);
  const [period, setPeriod] = useState(match === -1 ? CUSTOM : String(match));
  const [picked, setPicked] = useState<number[]>(params.carIds);
  const preset = period === CUSTOM ? null : presets[Number(period)];

  // Close the car list when tapping anywhere else.
  useEffect(() => {
    const close = (e: PointerEvent) => {
      const menu = carsMenu.current;
      if (menu?.open && !menu.contains(e.target as Node)) menu.open = false;
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const submit = () => form.current?.requestSubmit();
  const carsLabel =
    picked.length === 0
      ? "Magari yote"
      : picked.length === 1
        ? (cars.find((c) => c.id === picked[0])?.plate ?? "Gari 1")
        : `Magari ${picked.length}`;

  return (
    <form ref={form} method="get" className="card flex flex-wrap items-end gap-3">
      {tab === "mapato" && <input type="hidden" name="tab" value="mapato" />}
      <label className="min-w-0 flex-1 basis-36 sm:flex-none sm:basis-auto">
        <span className="mb-1 block text-xs text-muted">Kipindi</span>
        <select
          value={period}
          onChange={(e) => {
            const next = e.target.value;
            flushSync(() => setPeriod(next));
            if (next !== CUSTOM) submit();
          }}
          className="input sm:w-44"
        >
          {presets.map((p, i) => (
            <option key={p.label} value={i}>
              {p.label}
            </option>
          ))}
          <option value={CUSTOM}>Tarehe nyingine…</option>
        </select>
      </label>

      {preset ? (
        <>
          <input type="hidden" name="from" value={preset.from} />
          <input type="hidden" name="to" value={preset.to} />
        </>
      ) : (
        <>
          <label className="min-w-0 flex-1 basis-36 sm:flex-none sm:basis-auto">
            <span className="mb-1 block text-xs text-muted">Kuanzia</span>
            <input type="date" name="from" defaultValue={params.from} max={today} className="input" />
          </label>
          <label className="min-w-0 flex-1 basis-36 sm:flex-none sm:basis-auto">
            <span className="mb-1 block text-xs text-muted">Hadi</span>
            <input type="date" name="to" defaultValue={params.to} max={today} className="input" />
          </label>
        </>
      )}

      <div className="min-w-0 basis-full max-sm:order-last sm:basis-auto">
        <span className="mb-1 block text-xs text-muted">Magari</span>
        <details ref={carsMenu} className="group relative">
          <summary className="input flex cursor-pointer list-none items-center justify-between gap-2 sm:w-44 [&::-webkit-details-marker]:hidden">
            <span className="truncate">{carsLabel}</span>
            <span aria-hidden="true" className="text-muted group-open:rotate-180">
              ▾
            </span>
          </summary>
          <div className="absolute left-0 z-30 mt-1 grid w-full sm:w-72 max-w-[calc(100vw-4rem)] gap-1 rounded-lg border border-line bg-surface p-2 shadow-lg">
            <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-background">
              <input
                type="checkbox"
                checked={picked.length === 0}
                onChange={() => setPicked([])}
                className="size-4 accent-accent"
              />
              <span className="font-medium">Magari yote</span>
            </label>
            <div className="max-h-64 overflow-y-auto border-t border-line pt-1">
              {cars.map((c) => (
                <label
                  key={c.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-background"
                >
                  <input
                    type="checkbox"
                    name="cars"
                    value={c.id}
                    checked={picked.includes(c.id)}
                    onChange={(e) =>
                      setPicked((p) => (e.target.checked ? [...p, c.id] : p.filter((id) => id !== c.id)))
                    }
                    className="size-4 accent-accent"
                  />
                  <span className="plate">{c.plate}</span>
                  <span className="truncate text-muted">{c.car}</span>
                </label>
              ))}
            </div>
            <button type="submit" className="btn btn-primary mt-1">
              Onyesha
            </button>
          </div>
        </details>
      </div>

      <label className="min-w-0 flex-1 basis-36 sm:flex-none sm:basis-auto">
        <span className="mb-1 block text-xs text-muted">Panga</span>
        <select name="group" defaultValue={params.group} onChange={submit} className="input sm:w-36">
          {groupings.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </label>

      {!preset && (
        <button type="submit" className="btn btn-primary w-full max-sm:order-last sm:w-auto">
          Onyesha
        </button>
      )}
    </form>
  );
}
