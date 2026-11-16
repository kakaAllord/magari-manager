"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Preset = { label: string; from: string; to: string };

// The period the voucher list covers: a quick choice, or two dates. It lives in the URL.
export function VoucherPeriod({ presets, from, to, today }: { presets: Preset[]; from: string; to: string; today: string }) {
  const router = useRouter();
  const match = presets.find((p) => p.from === from && p.to === to);
  const [custom, setCustom] = useState(!match);
  const go = (f: string, t: string) => router.push(`?${new URLSearchParams({ from: f, to: t })}`, { scroll: false });

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="block">
        <span className="sr-only">Kipindi</span>
        <select
          value={custom ? "custom" : (match?.label ?? "custom")}
          onChange={(e) => {
            const p = presets.find((x) => x.label === e.target.value);
            setCustom(!p);
            if (p) go(p.from, p.to);
          }}
          className="input w-auto"
        >
          {presets.map((p) => (
            <option key={p.label} value={p.label}>
              {p.label}
            </option>
          ))}
          <option value="custom">Chagua tarehe…</option>
        </select>
      </label>
      {custom && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            go(String(data.get("from")), String(data.get("to")));
          }}
        >
          <label className="block">
            <span className="sr-only">Kuanzia</span>
            <input type="date" name="from" required max={today} defaultValue={from} className="input w-auto" aria-label="Kuanzia" />
          </label>
          <span className="pb-2.5 text-sm text-muted">hadi</span>
          <label className="block">
            <span className="sr-only">Hadi</span>
            <input type="date" name="to" required max={today} defaultValue={to} className="input w-auto" aria-label="Hadi" />
          </label>
          <button type="submit" className="btn btn-ghost">
            Onyesha
          </button>
        </form>
      )}
    </div>
  );
}
