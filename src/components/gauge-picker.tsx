import { GAUGE } from "@/lib/fuel-calc";

// The fuel gauge as nine taps, empty to full. Drivers copy the needle, they don't estimate litres.
export function GaugePicker({ defaultValue, error }: { defaultValue?: string; error?: string }) {
  return (
    <fieldset>
      <legend className="label">Mafuta yaliyopo sasa (geji)</legend>
      <div className="grid grid-cols-9 overflow-hidden rounded-lg border border-line">
        {GAUGE.map((g) => (
          <label
            key={g.eighths}
            title={g.label}
            className={`grid min-h-11 cursor-pointer place-items-center border-line text-sm font-medium tabular-nums not-first:border-l hover:bg-background has-checked:bg-accent has-checked:text-accent-fg has-focus-visible:outline-2 has-focus-visible:outline-accent ${g.eighths === 0 ? "text-danger" : ""}`}
          >
            <input
              type="radio"
              name="gauge"
              value={g.eighths}
              required
              defaultChecked={defaultValue === String(g.eighths)}
              aria-label={g.label}
              className="sr-only"
            />
            {g.short}
          </label>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted">
        <span>Tupu</span>
        <span>Nusu</span>
        <span>Imejaa</span>
      </div>
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </fieldset>
  );
}
