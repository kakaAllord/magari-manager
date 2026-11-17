"use client";

import { useT } from "@/components/lang-provider";
import { useActionState, useState } from "react";
import { deleteIncome } from "@/app/actions/incomes";

// Two steps, so a stray tap doesn't remove an entry.
export function DeleteIncome({ incomeId, source }: { incomeId: number; source: string }) {
  const t = useT();
  const [state, action, pending] = useActionState(deleteIncome, undefined);
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <div className="flex justify-end">
        <button type="button" onClick={() => setConfirming(true)} className="btn btn-ghost text-danger">
          {t("Futa", "Delete")}
        </button>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-wrap items-center justify-end gap-2 rounded-lg bg-danger-soft p-2">
      <input type="hidden" name="incomeId" value={incomeId} />
      <p className="mr-auto text-sm">{t(`Futa mapato ya “${source}”?`, `Delete the income from “${source}”?`)}</p>
      <div className="flex gap-2">
        <button type="button" onClick={() => setConfirming(false)} className="btn btn-ghost">
          {t("Hapana", "No")}
        </button>
        <button type="submit" disabled={pending} className="btn bg-danger text-white hover:opacity-90">
          {pending ? t("Inafuta…", "Deleting…") : t("Ndiyo, futa", "Yes, delete")}
        </button>
      </div>
      {state && <p className="w-full text-sm text-danger">{state.message}</p>}
    </form>
  );
}
