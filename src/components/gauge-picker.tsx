"use client";

import { useT } from "@/components/lang-provider";
import { useState } from "react";
import { GAUGE } from "@/lib/fuel-calc";
import { formatLitres } from "@/lib/format";

// The fuel gauge as nine taps, empty to full. Drivers copy the needle, they don't estimate litres.
// With the tank size known, the picked mark is also shown in litres. `optional` lets a form leave it
// empty (a new car's starting reading can wait).
export function GaugePicker({
  defaultValue,
  error,
  tankLitres,
  optional = false,
  label,
}: {
  defaultValue?: string;
  error?: string;
  tankLitres?: number | null;
  optional?: boolean;
  label?: string;
}) {
  const t = useT();
  const [picked, setPicked] = useState(defaultValue ?? "");

  return (
    <fieldset>
      <legend className="label">{label ?? t("Mafuta yaliyopo sasa (geji)", "Fuel in the tank now (gauge)")}</legend>
      <div className="grid grid-cols-9 overflow-hidden rounded-lg border border-line">
        {GAUGE.map((g) => (
          <label
            key={g.eighths}
            title={t<string>(g.label, g.en)}
            className={`grid min-h-11 cursor-pointer place-items-center border-line text-sm font-medium tabular-nums not-first:border-l hover:bg-background has-checked:bg-accent has-checked:text-accent-fg has-focus-visible:outline-2 has-focus-visible:outline-accent ${g.eighths === 0 ? "text-danger" : ""}`}
          >
            <input
              type="radio"
              name="gauge"
              value={g.eighths}
              required={!optional}
              defaultChecked={defaultValue === String(g.eighths)}
              onChange={() => setPicked(String(g.eighths))}
              aria-label={t<string>(g.label, g.en)}
              className="sr-only"
            />
            {g.short}
          </label>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted">
        <span>{t("Tupu", "Empty")}</span>
        <span>{tankLitres && picked !== "" ? t(`≈ lita ${formatLitres((tankLitres * Number(picked)) / 8)} kati ya ${tankLitres}`, `≈ ${formatLitres((tankLitres * Number(picked)) / 8)} of ${tankLitres} litres`) : t("Nusu", "Half")}</span>
        <span>{t("Imejaa", "Full")}</span>
      </div>
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </fieldset>
  );
}
