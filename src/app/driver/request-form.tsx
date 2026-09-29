"use client";

import { useActionState } from "react";
import { createRequest } from "@/app/actions/requests";
import { MAX_REASON_LENGTH } from "@/lib/validation";

// One tap fills a common reason; the driver can still type anything.
const quickReasons = ["Mafuta", "Matengenezo", "Maegesho", "Usafi wa gari", "Ushuru wa barabara"];

export function RequestForm() {
  const [state, action, pending] = useActionState(createRequest, undefined);
  const failed = state && !state.ok ? state : undefined;

  return (
    <form action={action} className="grid gap-4">
      <label className="block">
        <span className="label">Kiasi</span>
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
      <label className="block">
        <span className="label">Sababu</span>
        <textarea
          id="reason"
          name="reason"
          rows={3}
          required
          maxLength={MAX_REASON_LENGTH}
          placeholder="Mfano: Mafuta ya safari ya uwanja wa ndege"
          defaultValue={failed?.values.reason}
          className="input"
        />
        {failed?.errors.reason && <p className="mt-1 text-sm text-danger">{failed.errors.reason}</p>}
      </label>
      <div className="flex flex-wrap gap-2" aria-label="Sababu za haraka">
        {quickReasons.map((r) => (
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
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Inatuma…" : "Tuma ombi"}
      </button>
      {state?.ok && (
        <p role="status" className="rounded-md bg-ok-soft px-3 py-2 text-sm text-ok">
          Ombi limetumwa. Utaona jibu la meneja hapa.
        </p>
      )}
    </form>
  );
}
