"use client";

import { useEffect, useRef, useState } from "react";
import { EARLIEST_ENTRY_DATE } from "@/lib/validation";

// The date of an expense or income entry, today unless the manager is typing in history. A past
// date gets a warning line saying what will happen, and `onPast` lets the form relabel its button.
export function EntryDate({
  today,
  defaultValue,
  error,
  pastHint,
  onPast,
}: {
  today: string;
  defaultValue?: string;
  error?: string;
  pastHint: string;
  onPast?: (past: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue || today);
  const past = value !== "" && value < today;

  useEffect(() => onPast?.(past), [past, onPast]);
  // React resets the form after each submit; read the field back once the reset has happened.
  useEffect(() => {
    const form = ref.current?.form;
    if (!form) return;
    const onReset = () => setTimeout(() => setValue(ref.current?.value ?? today));
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [today]);

  return (
    <label className="block">
      <span className="label">Tarehe</span>
      <input
        ref={ref}
        type="date"
        name="date"
        required
        min={EARLIEST_ENTRY_DATE}
        max={today}
        defaultValue={defaultValue || today}
        onChange={(e) => setValue(e.target.value)}
        className="input"
      />
      {past && <p className="mt-1 rounded-md bg-warn-soft px-2 py-1 text-xs text-warn">{pastHint}</p>}
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </label>
  );
}
