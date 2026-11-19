"use client";

import { useT } from "@/components/lang-provider";
import { useState } from "react";
import { Icon } from "./icons";
import { MIN_PASSWORD_LENGTH } from "@/lib/validation";

// A new password field with a show/hide eye: the director can read out one they hand over, and someone
// changing their own can check it instead of typing it twice. Shown as text, phone keyboards would
// capitalise or correct it, saving a password other than the one typed.
export function PasswordInput({ label, name = "password" }: { label: string; name?: string }) {
  const t = useT();
  const [shown, setShown] = useState(false);
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="relative">
        <input
          name={name}
          type={shown ? "text" : "password"}
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="input pr-11"
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? t("Ficha nenosiri", "Hide password") : t("Onyesha nenosiri", "Show password")}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted hover:text-foreground"
        >
          <Icon name={shown ? "eyeOff" : "eye"} className="size-4" />
        </button>
      </div>
      <span className="mt-1 block text-xs text-muted">{t(`Angalau herufi ${MIN_PASSWORD_LENGTH}.`, `At least ${MIN_PASSWORD_LENGTH} characters.`)}</span>
    </label>
  );
}
