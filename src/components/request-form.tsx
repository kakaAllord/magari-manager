"use client";

import type { Tr } from "@/lib/i18n";
import { useT } from "@/components/lang-provider";
import { useActionState, useState } from "react";
import type { RequestFormState } from "@/app/actions/requests";
import { DuplicateWarning } from "@/components/duplicate-warning";
import { EntryDate } from "@/components/entry-date";
import { ExpenseItems } from "@/components/expense-items";
import { GaugePicker } from "@/components/gauge-picker";
import { Icon } from "@/components/icons";
import { gaugeLabel } from "@/lib/fuel-calc";
import { formatDateTime, formatKm, formatMoney } from "@/lib/format";
import type { CarOption } from "@/lib/reports";
import { MAX_ISSUE_NOTE_LENGTH, MAX_REASON_LENGTH } from "@/lib/validation";
import { PAYMENT_METHODS } from "@/lib/voucher-fields";

// One tap fills a common reason; the driver can still type anything. Fuel is its own kind of request.
const quickReasons = (t: Tr) => [
  t("Matengenezo", "Repairs"),
  t("Maegesho", "Parking"),
  t("Usafi wa gari", "Car wash"),
  t("Ushuru wa barabara", "Road toll"),
];

// What a driver's fuel request is checked against: their car's last reading (none until the manager
// records a starting one), whether a fuel request is still waiting to be paid, and what the car
// still lacks before fuel can be asked for (its fuel type, tank or reading; empty when ready).
export type DriverFuel = {
  last: { odometer: number; eighths: number; at: Date } | null;
  openFuel: boolean;
  missing: string;
} | null;

// Drivers ask for their own car, and a fuel request carries their km and gauge reading. Managers
// also pick the car (or none), and `cars` turns that on; their fuel requests carry no reading.
// Fuel is asked for as the price per litre at the station (it differs from place to place) and the
// litres needed; the amount is their product.
// `today` adds a date, so a manager can type in past expenses as history.
export function RequestForm({
  submit,
  cars,
  fuel,
  today,
  sent,
}: {
  submit: (prev: RequestFormState, formData: FormData) => Promise<RequestFormState>;
  cars?: CarOption[];
  fuel?: DriverFuel;
  today?: string;
  sent: string;
}) {
  const t = useT();
  const [state, action, pending] = useActionState(submit, undefined);
  const failed = state && !state.ok ? state : undefined;
  const [past, setPast] = useState(false);
  const [picked, setKind] = useState(failed?.values.kind ?? "other");
  const isDriver = !cars;
  const notReady = isDriver && fuel ? fuel.missing : "";
  const fuelBlocked = isDriver && (fuel === null || fuel?.openFuel || notReady !== "");
  // After a fuel request goes in, fuel is blocked until it's paid, so the form falls back to the rest.
  const kind = fuelBlocked ? "other" : picked;
  // Price and litres as typed, to show what the fuel will cost. They follow the form: kept when it
  // comes back with an error, cleared once a request goes in. The server works the amount out again.
  const [typed, setTyped] = useState({ price: failed?.values.fuelPrice ?? "", litres: failed?.values.litres ?? "" });
  const [seen, setSeen] = useState(state);
  // The breakdown starts over after each request that goes in, like the rest of the form.
  const [sentCount, setSentCount] = useState(0);
  const [itemsOpen, setItemsOpen] = useState(Boolean(failed?.values.items?.some((l) => l.description || l.quantity || l.unitPrice)));
  if (state !== seen) {
    setSeen(state);
    if (state?.ok) {
      setSentCount((n) => n + 1);
      setItemsOpen(false);
    }
    setTyped(
      state && !state.ok ? { price: state.values.fuelPrice ?? "", litres: state.values.litres ?? "" } : { price: "", litres: "" },
    );
  }
  const price = Number(typed.price.replace(/[,\s]/g, ""));
  const litres = Number(/^\s*\d+,\d{1,2}\s*$/.test(typed.litres) ? typed.litres.replace(",", ".") : typed.litres.replace(/[,\s]/g, ""));
  const fuelTotal = price >= 500 && litres > 0 ? Math.round(price * litres) : null;

  return (
    <form action={action} className="grid gap-4">
      <fieldset key={fuelBlocked ? "blocked" : "open"}>
        <legend className="label">{t("Aina ya ombi", "Kind of request")}</legend>
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-line p-1">
          {(
            [
              ["fuel", t("Mafuta", "Fuel")],
              ["other", t("Mengineyo", "Other")],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className="flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md text-sm text-muted has-checked:bg-accent-soft has-checked:font-medium has-checked:text-accent has-disabled:cursor-not-allowed has-disabled:opacity-50"
            >
              <input
                type="radio"
                name="kind"
                value={value}
                // Uncontrolled, so React's form reset after a submit puts back the kind that was sent.
                defaultChecked={kind === value}
                disabled={value === "fuel" && fuelBlocked}
                onChange={() => setKind(value)}
                className="sr-only"
              />
              {value === "fuel" && <Icon name="fuel" className="size-4" />}
              {label}
            </label>
          ))}
        </div>
        {isDriver && fuel?.openFuel && (
          <p className="mt-1 text-xs text-muted">
            {t(
              "Ombi lako la mafuta la mwisho bado halijalipwa. Utaomba mafuta tena likishalipwa au kukataliwa.",
              "Your last fuel request hasn't been paid yet. You can ask for fuel again once it's paid or declined.",
            )}
          </p>
        )}
        {isDriver && fuel === null && <p className="mt-1 text-xs text-muted">{t("Utaomba mafuta ukishapewa gari.", "You can ask for fuel once you have a car.")}</p>}
        {notReady && (
          <p className="mt-1 text-xs text-muted">
            {t(
              `Gari lako bado halina ${notReady}. Meneja akishakamilisha, utaomba mafuta.`,
              `Your car doesn't have its ${notReady} yet. Once the manager adds it, you can ask for fuel.`,
            )}
          </p>
        )}
        {failed?.errors.kind && <p className="mt-1 text-sm text-danger">{failed.errors.kind}</p>}
      </fieldset>

      {cars && (
        <label className="block">
          <span className="label">{t("Gari", "Car")}</span>
          {/* React doesn't apply a new defaultValue to a mounted select, so remount it to keep the car
              picked when the form comes back with an error. */}
          <select
            key={failed ? `car-${failed.values.carId}` : "fresh"}
            name="carId"
            required
            defaultValue={failed?.values.carId ?? ""}
            className="input"
          >
            <option value="" disabled>
              {t("Chagua namba ya gari", "Pick the car's plate")}
            </option>
            {/* Fuel bought now needs the car's fuel type, tank and starting reading; past fuel is history. */}
            {cars.map((c) => (
              <option key={c.id} value={c.id} disabled={kind === "fuel" && !past && !c.fuelReady}>
                {c.plate}
                {c.car && ` · ${c.car}`}
                {kind === "fuel" && !past && !c.fuelReady && t(" · bado haliko tayari kwa mafuta", " · not ready for fuel yet")}
              </option>
            ))}
            {kind !== "fuel" && <option value="none">{t("Bila gari (ofisi na mengineyo)", "No car (office and other)")}</option>}
          </select>
          {kind === "fuel" && !past && cars.some((c) => !c.fuelReady) && (
            <p className="mt-1 text-xs text-muted">
              {t(
                "Gari linaombewa mafuta likishakuwa na aina ya mafuta, tanki na kipimo cha sasa. Vikamilishe kwenye Magari.",
                "Fuel can be asked for a car once it has a fuel type, a tank size and a current reading. Add them on Cars.",
              )}
            </p>
          )}
          {failed?.errors.carId && <p className="mt-1 text-sm text-danger">{failed.errors.carId}</p>}
        </label>
      )}

      {today && (
        <EntryDate
          today={today}
          defaultValue={failed?.values.date}
          error={failed?.errors.date}
          onPast={setPast}
          pastHint={t(
            "Tarehe iliyopita: litahifadhiwa kama matumizi ya zamani yaliyokwisha lipwa, bila kupitia kwa meneja wa kiwanda wala mhasibu.",
            "A past date: it is saved as past spending already paid, without going to the factory manager or the accountant.",
          )}
        />
      )}
      {today && past && (
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="label">{t("Yalilipwa kwa", "Paid by")}</span>
            <select
              key={failed ? `method-${failed.values.paymentMethod}` : "fresh"}
              name="paymentMethod"
              required
              defaultValue={failed?.values.paymentMethod || "cash"}
              className="input"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.key} value={m.key}>
                  {t<string>(m.sw, m.en)}
                </option>
              ))}
            </select>
            {failed?.errors.paymentMethod && <p className="mt-1 text-sm text-danger">{failed.errors.paymentMethod}</p>}
          </label>
          <label className="block">
            <span className="label">
              {t("Kumbukumbu", "Reference")} <span className="font-normal text-muted">{t("(si lazima)", "(optional)")}</span>
            </span>
            <input
              name="reference"
              maxLength={MAX_ISSUE_NOTE_LENGTH}
              autoComplete="off"
              placeholder={t("Namba ya M-Pesa, benki…", "M-Pesa or bank number…")}
              defaultValue={failed?.values.reference}
              className="input"
            />
          </label>
        </div>
      )}

      {isDriver && kind === "fuel" && (
        <>
          <label className="block">
            <span className="label">{t("Kilomita kwenye gari sasa", "Kilometres on the car now")}</span>
            <input
              name="odometer"
              inputMode="numeric"
              placeholder={fuel?.last ? formatKm(fuel.last.odometer + 250) : "45,500"}
              required
              defaultValue={failed?.values.odometer}
              className="input text-lg font-semibold tabular-nums sm:text-lg"
            />
            {fuel?.last && (
              <p className="mt-1 text-xs text-muted">
                {t("Kipimo cha mwisho", "Last reading")}: km {formatKm(fuel.last.odometer)} · {gaugeLabel(fuel.last.eighths, t)} ·{" "}
                {formatDateTime(fuel.last.at)}
              </p>
            )}
            {failed?.errors.odometer && <p className="mt-1 text-sm text-danger">{failed.errors.odometer}</p>}
          </label>
          <GaugePicker defaultValue={failed?.values.gauge} error={failed?.errors.gauge} />
        </>
      )}

      {kind !== "fuel" && !itemsOpen && (
        <label className="block">
          <span className="label">{t("Kiasi", "Amount")}</span>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">TSh</span>
            <input
              name="amount"
              inputMode="numeric"
              placeholder="40,000"
              required
              defaultValue={failed?.values.amount}
              className="input pl-12 text-lg font-semibold tabular-nums sm:text-lg"
            />
          </div>
          {failed?.errors.amount && <p className="mt-1 text-sm text-danger">{failed.errors.amount}</p>}
        </label>
      )}
      {kind !== "fuel" && (
        <ExpenseItems
          key={sentCount}
          initial={failed?.values.items}
          errors={failed?.errors.items}
          message={failed?.errors.itemsMessage}
          onChange={setItemsOpen}
        />
      )}
      {kind === "fuel" && (
        <div className="grid gap-2">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label">{t("Bei ya lita moja", "Price per litre")}</span>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">TSh</span>
                <input
                  name="fuelPrice"
                  inputMode="numeric"
                  placeholder="3,000"
                  required
                  defaultValue={failed?.values.fuelPrice}
                  onInput={(e) => {
                    const value = e.currentTarget.value;
                    setTyped((prev) => ({ ...prev, price: value }));
                  }}
                  className="input pl-12 tabular-nums"
                />
              </div>
              {failed?.errors.fuelPrice && <p className="mt-1 text-sm text-danger">{failed.errors.fuelPrice}</p>}
            </label>
            <label className="block">
              <span className="label">{t("Lita ngapi", "How many litres")}</span>
              <div className="relative">
                <input
                  name="litres"
                  inputMode="decimal"
                  placeholder="20"
                  required
                  defaultValue={failed?.values.litres}
                  onInput={(e) => {
                    const value = e.currentTarget.value;
                    setTyped((prev) => ({ ...prev, litres: value }));
                  }}
                  className="input pr-10 tabular-nums"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">L</span>
              </div>
              {failed?.errors.litres && <p className="mt-1 text-sm text-danger">{failed.errors.litres}</p>}
            </label>
          </div>
          <div className="flex items-baseline justify-between gap-3 rounded-lg bg-background px-3 py-2.5" aria-live="polite">
            <span className="text-sm text-muted">{t("Jumla ya kuomba", "Total to ask for")}</span>
            <span className="text-lg font-semibold tabular-nums">{fuelTotal === null ? "–" : formatMoney(fuelTotal)}</span>
          </div>
          <p className="text-xs text-muted">{t("Bei ya kituo cha mafuta, kwa lita moja. Inatofautiana kati ya vituo.", "The fuel station's price for one litre. It differs between stations.")}</p>
        </div>
      )}
      <label className="block">
        <span className="label">{kind === "fuel" ? t("Maelezo (si lazima)", "Note (optional)") : t("Sababu", "Reason")}</span>
        <textarea
          id="reason"
          name="reason"
          rows={kind === "fuel" ? 2 : 3}
          required={kind !== "fuel"}
          maxLength={MAX_REASON_LENGTH}
          placeholder={kind === "fuel" ? t("Mfano: safari ya Morogoro", "E.g. trip to Morogoro") : t("Mfano: Kubadilisha oili", "E.g. Oil change")}
          defaultValue={failed?.values.reason}
          className="input"
        />
        {failed?.errors.reason && <p className="mt-1 text-sm text-danger">{failed.errors.reason}</p>}
      </label>
      {kind !== "fuel" && (
        <div className="flex flex-wrap gap-2" aria-label={t("Sababu za haraka", "Quick reasons")}>
          {quickReasons(t).map((r) => (
            <button
              key={r}
              type="button"
              className="chip"
              onClick={(e) => {
                const field = e.currentTarget.form?.elements.namedItem("reason");
                if (field instanceof HTMLTextAreaElement) {
                  field.value = r;
                  field.focus();
                }
              }}
            >
              {r}
            </button>
          ))}
        </div>
      )}
      {failed?.duplicate && <DuplicateWarning match={failed.duplicate} what={t("Ombi", "Request")} />}
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending
          ? t("Inatuma…", "Sending…")
          : failed?.duplicate
            ? t("Ndiyo, ni jipya: tuma", "Yes, it's new: send")
            : past
              ? t("Hifadhi matumizi ya zamani", "Save past spending")
              : cars
                ? t("Omba na ukubali", "Request and approve")
                : t("Tuma ombi", "Send request")}
      </button>
      {state?.ok && (
        <p role="status" className="rounded-md bg-ok-soft px-3 py-2 text-sm text-ok">
          {state.backfilled ? t("Matumizi ya zamani yamehifadhiwa kama yaliyokwisha lipwa.", "Past spending saved as already paid.") : sent}
        </p>
      )}
    </form>
  );
}
