"use client";

import { useT } from "@/components/lang-provider";
import { useActionState } from "react";
import { changeOwnPassword } from "@/app/actions/account";
import { PasswordInput } from "@/components/password-input";

export function PasswordForm() {
  const t = useT();
  const [state, action, pending] = useActionState(changeOwnPassword, undefined);

  return (
    <form action={action} className="grid gap-3 sm:max-w-md">
      <label>
        <span className="label">{t("Nenosiri la sasa", "Current password")}</span>
        <input name="current" type="password" required autoComplete="current-password" className="input" />
      </label>
      <PasswordInput label={t("Nenosiri jipya", "New password")} />
      <div>
        <button type="submit" disabled={pending} className="btn btn-primary w-full sm:w-auto">
          {pending ? t("Inahifadhi…", "Saving…") : t("Hifadhi nenosiri", "Save password")}
        </button>
      </div>
      {state && (
        <p role="status" className={`text-sm ${state.ok ? "text-ok" : "text-danger"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
