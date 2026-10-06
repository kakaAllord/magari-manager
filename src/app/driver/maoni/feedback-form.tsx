"use client";

import { useActionState } from "react";
import { sendFeedback } from "@/app/actions/feedback";
import { MAX_FEEDBACK_LENGTH } from "@/lib/validation";

export function FeedbackForm() {
  const [state, action, pending] = useActionState(sendFeedback, undefined);
  const failed = state && !state.ok ? state : undefined;
  return (
    <form action={action} className="grid gap-3">
      <label className="block">
        <span className="label">Maoni yako</span>
        <textarea
          name="body"
          rows={5}
          required
          maxLength={MAX_FEEDBACK_LENGTH}
          placeholder="Mfano: Tunaomba matairi ya akiba yakaguliwe kila mwezi."
          defaultValue={failed?.body}
          className="input"
        />
        {failed && <p className="mt-1 text-sm text-danger">{failed.error}</p>}
      </label>
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Inatuma…" : "Tuma maoni"}
      </button>
      {state?.ok && (
        <p role="status" className="rounded-md bg-ok-soft px-3 py-2 text-sm text-ok">
          Asante. Maoni yako yametumwa bila jina lako.
        </p>
      )}
    </form>
  );
}
