"use client";

import { useActionState } from "react";
import { createRequest } from "@/app/actions/requests";
import { MAX_REASON_LENGTH } from "@/lib/validation";

export function RequestForm() {
  const [state, action, pending] = useActionState(createRequest, undefined);
  const failed = state && !state.ok ? state : undefined;

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="label">Amount (TSh)</span>
        <input
          name="amount"
          inputMode="numeric"
          placeholder="40,000"
          required
          defaultValue={failed?.values.amount}
          className="input max-w-40"
        />
        {failed?.errors.amount && <p className="mt-1 text-sm text-danger">{failed.errors.amount}</p>}
      </label>
      <label className="block">
        <span className="label">Reason</span>
        <textarea
          name="reason"
          rows={3}
          required
          maxLength={MAX_REASON_LENGTH}
          placeholder="e.g. Fuel for the airport run"
          defaultValue={failed?.values.reason}
          className="input"
        />
        {failed?.errors.reason && <p className="mt-1 text-sm text-danger">{failed.errors.reason}</p>}
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Sending…" : "Send request"}
        </button>
        {state?.ok && <p className="text-sm text-ok">Request sent.</p>}
      </div>
    </form>
  );
}
