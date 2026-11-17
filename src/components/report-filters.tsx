"use client";

import type { Tr } from "@/lib/i18n";
import { useT } from "@/components/lang-provider";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Dialog } from "@/components/dialog";
import { Icon, type IconName } from "@/components/icons";
import { formatDay, type Grouping, type ReportParams } from "@/lib/report-params";
import type { CarOption } from "@/lib/reports";

type Preset = { label: string; from: string; to: string };

const groupings = (t: Tr): { value: Grouping; label: string }[] => [
  { value: "car", label: t("Kwa gari", "By car") },
  { value: "month", label: t("Kwa mwezi", "By month") },
  { value: "week", label: t("Kwa wiki", "By week") },
];

const CUSTOM = "custom";

export type Download = { label: string; hint: string; href: string; icon: IconName };

// One row: a Chuja button with the active filters as chips beside it, and a round download button.
// The filters themselves live in a dialog, applied together with Onyesha.
export function ReportToolbar({
  presets,
  params,
  cars,
  today,
  tab,
  downloads,
}: {
  presets: Preset[];
  params: ReportParams;
  cars: CarOption[];
  today: string;
  tab: string;
  downloads: Download[];
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const match = presets.find((p) => p.from === params.from && p.to === params.to);
  const chips = [
    match?.label ?? `${formatDay(params.from)} – ${formatDay(params.to)}`,
    params.carIds.length === 0
      ? t("Magari yote", "All cars")
      : params.carIds.length === 1
        ? (cars.find((c) => c.id === params.carIds[0])?.plate ?? t("Gari 1", "1 car"))
        : t(`Magari ${params.carIds.length}`, `${params.carIds.length} cars`),
    groupings(t).find((g) => g.value === params.group)!.label,
  ];

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => setOpen(true)} className="btn btn-ghost shrink-0 gap-2 rounded-full">
        <Icon name="filter" className="size-4" />
        {t("Chuja", "Filter")}
      </button>
      <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto [scrollbar-width:none]">
        {chips.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-medium whitespace-nowrap text-accent"
          >
            {c}
          </button>
        ))}
      </div>
      <DownloadMenu downloads={downloads} />

      <Dialog open={open} onClose={() => setOpen(false)} title={t("Chuja ripoti", "Filter the report")}>
        <FilterForm presets={presets} params={params} cars={cars} today={today} tab={tab} match={match} />
      </Dialog>
    </div>
  );
}

function FilterForm({
  presets,
  params,
  cars,
  today,
  tab,
  match,
}: {
  presets: Preset[];
  params: ReportParams;
  cars: CarOption[];
  today: string;
  tab: string;
  match: Preset | undefined;
}) {
  const t = useT();
  const [period, setPeriod] = useState(match ? String(presets.indexOf(match)) : CUSTOM);
  const [picked, setPicked] = useState<number[]>(params.carIds);
  const preset = period === CUSTOM ? null : presets[Number(period)];

  return (
    <form method="get" className="grid gap-5">
      {tab !== "matumizi" && <input type="hidden" name="tab" value={tab} />}
      <div className="grid gap-3">
        <label className="block">
          <span className="label">{t("Kipindi", "Period")}</span>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="input">
            {presets.map((p, i) => (
              <option key={p.label} value={i}>
                {p.label}
              </option>
            ))}
            <option value={CUSTOM}>{t("Tarehe nyingine…", "Other dates…")}</option>
          </select>
        </label>
        {preset ? (
          <>
            <input type="hidden" name="from" value={preset.from} />
            <input type="hidden" name="to" value={preset.to} />
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="mb-1 block text-xs text-muted">{t("Kuanzia", "From")}</span>
              <input type="date" name="from" defaultValue={params.from} max={today} className="input" />
            </label>
            <label>
              <span className="mb-1 block text-xs text-muted">{t("Hadi", "To")}</span>
              <input type="date" name="to" defaultValue={params.to} max={today} className="input" />
            </label>
          </div>
        )}
      </div>

      <fieldset>
        <legend className="label">{t("Magari", "Cars")}</legend>
        <div className="max-h-56 overflow-y-auto rounded-lg border border-line p-1">
          <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm hover:bg-background">
            <input
              type="checkbox"
              checked={picked.length === 0}
              onChange={() => setPicked([])}
              className="size-4 accent-accent"
            />
            <span className="font-medium">{t("Magari yote", "All cars")}</span>
          </label>
          {cars.map((c) => (
            <label
              key={c.id}
              className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm hover:bg-background"
            >
              <input
                type="checkbox"
                name="cars"
                value={c.id}
                checked={picked.includes(c.id)}
                onChange={(e) => setPicked((p) => (e.target.checked ? [...p, c.id] : p.filter((id) => id !== c.id)))}
                className="size-4 accent-accent"
              />
              <span className="plate">{c.plate}</span>
              <span className="truncate text-muted">{c.car}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="label">{t("Panga", "Group")}</span>
        <select name="group" defaultValue={params.group} className="input">
          {groupings(t).map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex justify-end gap-2">
        <Link href={tab === "matumizi" ? "?" : `?tab=${tab}`} className="btn btn-ghost">
          {t("Rudisha", "Reset")}
        </Link>
        <button type="submit" className="btn btn-primary">
          {t("Onyesha", "Show")}
        </button>
      </div>
    </form>
  );
}

function DownloadMenu({ downloads }: { downloads: Download[] }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div ref={wrapper} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("Pakua ripoti", "Download the report")}
        title={t("Pakua ripoti", "Download the report")}
        className="grid size-10 place-items-center rounded-full border border-line bg-surface text-accent hover:border-accent hover:bg-accent-soft"
      >
        <Icon name="download" className="size-5" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1 grid w-64 rounded-xl border border-line bg-surface p-1 shadow-lg">
          <p className="px-3 pt-2 pb-1 text-xs font-medium text-muted">{t("Pakua ripoti hii kama", "Download this report as")}</p>
          {downloads.map((d) => (
            <a
              key={d.label}
              role="menuitem"
              href={d.href}
              download
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-background"
            >
              <Icon name={d.icon} className="size-5 text-accent" />
              <span>
                <span className="block text-sm font-medium">{d.label}</span>
                <span className="block text-xs text-muted">{d.hint}</span>
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
