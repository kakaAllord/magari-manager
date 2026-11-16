"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { formatMoney } from "@/lib/format";
import { MAX_EXPENSE_ITEMS, MAX_ITEM_DESCRIPTION, type ExpenseItemErrors, type ExpenseItemInput } from "@/lib/validation";

const blank: ExpenseItemInput = { description: "", quantity: "", unitPrice: "" };

// What a line comes to as typed, for the running total; the server works it out again.
const num = (s: string) => Number(s.replace(/,/g, "").trim());
const lineAmount = (l: ExpenseItemInput) => {
  const q = num(l.quantity.replace(/^(\d+),(\d{1,2})$/, "$1.$2"));
  const p = num(l.unitPrice);
  return q > 0 && p > 0 ? Math.round(q * p) : 0;
};

// The optional breakdown (mchanganuo) of a request: what was bought, how many, at what price each,
// printed on the payment voucher. Closed it sends nothing; open it sends its lines and the amount
// becomes their total, so `onTotal` lets the form hide its own amount field meanwhile.
export function ExpenseItems({
  initial,
  errors,
  message,
  onChange,
}: {
  initial?: ExpenseItemInput[];
  errors?: Record<number, ExpenseItemErrors>;
  message?: string;
  onChange?: (open: boolean) => void;
}) {
  const start = initial?.filter((l) => l.description || l.quantity || l.unitPrice) ?? [];
  const [lines, setLines] = useState(() => start.map((l, i) => ({ key: i, ...l })));
  const [nextKey, setNextKey] = useState(start.length);
  const open = lines.length > 0;
  const setOpen = (rows: typeof lines) => {
    setLines(rows);
    onChange?.(rows.length > 0);
  };
  const add = () => {
    setOpen([...lines, { key: nextKey, ...blank }]);
    setNextKey((k) => k + 1);
  };
  const set = (key: number, field: keyof ExpenseItemInput, value: string) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, [field]: value } : l)));
  const total = lines.reduce((sum, l) => sum + lineAmount(l), 0);

  if (!open) {
    return (
      <button type="button" onClick={add} className="btn btn-ghost gap-2 justify-self-start px-2 text-accent">
        <Icon name="plus" className="size-4" />
        Ongeza mchanganuo <span className="font-normal text-muted">(si lazima)</span>
      </button>
    );
  }

  return (
    <fieldset className="grid gap-2 rounded-xl border border-line p-3">
      <legend className="px-1 text-sm font-medium">Mchanganuo</legend>
      <p className="-mt-1 text-xs text-muted">Kila kitu: idadi × bei ya kimoja. Jumla yake ndiyo kiasi cha ombi.</p>
      {lines.map((l, i) => {
        const e = errors?.[i];
        return (
          <div key={l.key} className="grid grid-cols-[1fr_auto] gap-2 border-t border-line pt-2 first-of-type:border-0 first-of-type:pt-0 sm:grid-cols-[minmax(0,1fr)_5rem_8rem_auto]">
            <label className="col-span-2 block sm:col-span-1">
              <span className="sr-only">Kitu {i + 1}</span>
              <input
                name="itemDescription"
                maxLength={MAX_ITEM_DESCRIPTION}
                placeholder="Mfano: Oili ya injini"
                value={l.description}
                onChange={(ev) => set(l.key, "description", ev.target.value)}
                className="input"
              />
              {e?.description && <span className="mt-1 block text-xs text-danger">{e.description}</span>}
            </label>
            <div className="col-span-2 grid grid-cols-[5rem_minmax(0,1fr)_auto] gap-2 sm:contents">
              <label className="block">
                <span className="sr-only">Idadi ya kitu {i + 1}</span>
                <input
                  name="itemQuantity"
                  inputMode="decimal"
                  placeholder="Idadi"
                  value={l.quantity}
                  onChange={(ev) => set(l.key, "quantity", ev.target.value)}
                  className="input tabular-nums"
                />
                {e?.quantity && <span className="mt-1 block text-xs text-danger">{e.quantity}</span>}
              </label>
              <label className="block">
                <span className="sr-only">Bei ya kimoja, kitu {i + 1}</span>
                <input
                  name="itemUnitPrice"
                  inputMode="numeric"
                  placeholder="Bei @"
                  value={l.unitPrice}
                  onChange={(ev) => set(l.key, "unitPrice", ev.target.value)}
                  className="input tabular-nums"
                />
                {e?.unitPrice && <span className="mt-1 block text-xs text-danger">{e.unitPrice}</span>}
              </label>
              <button
                type="button"
                onClick={() => setOpen(lines.filter((x) => x.key !== l.key))}
                className="btn btn-ghost size-11 self-start p-0 sm:size-9"
                aria-label={`Ondoa kitu ${i + 1}`}
              >
                <Icon name="close" className="size-4" />
              </button>
            </div>
          </div>
        );
      })}
      {message && <p className="text-sm text-danger">{message}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {lines.length < MAX_EXPENSE_ITEMS ? (
          <button type="button" onClick={add} className="btn btn-ghost gap-2 px-2">
            <Icon name="plus" className="size-4" />
            Ongeza kitu
          </button>
        ) : (
          <span />
        )}
        <p className="text-sm" aria-live="polite">
          <span className="text-muted">Jumla </span>
          <span className="text-lg font-semibold tabular-nums">{total > 0 ? formatMoney(total) : "–"}</span>
        </p>
      </div>
    </fieldset>
  );
}
