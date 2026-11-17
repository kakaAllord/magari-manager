"use client";

import { useT } from "@/components/lang-provider";
import { useActionState } from "react";
import { changeOwnPassword } from "@/app/actions/account";
import { MIN_PASSWORD_LENGTH } from "@/lib/validation";

export function PasswordForm() {
  const t = useT();
  const [state, action, pending] = useActionState(changeOwnPassword, undefined);

  return (
    <form action={action} className="grid gap-3 sm:max-w-md">
      <label>
        <span className="label">{t("Nenosiri la sasa", "Current password")}</span>
        <input name="current" type="password" required autoComplete="current-password" className="input" />
      </label>
      <label>
        <span className="label">{t("Nenosiri jipya", "New password")}</span>
        <input
          name="password"
          type="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          className="input"
        />
        <span className="mt-1 block text-xs text-muted">{t(`Herufi ${MIN_PASSWORD_LENGTH} au zaidi.`, `${MIN_PASSWORD_LENGTH} or more characters.`)}</span>
      </label>
      <label>
        <span className="label">{t("Rudia nenosiri jipya", "Repeat the new password")}</span>
        <input
          name="repeat"
          type="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          className="input"
        />
      </label>
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
