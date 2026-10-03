"use client";

import { useState } from "react";
import { Icon } from "./icons";
import { MIN_PASSWORD_LENGTH } from "@/lib/validation";

// A new password the director hands over in person, so it can be shown to read it out.
export function PasswordInput({ label, name = "password" }: { label: string; name?: string }) {
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
          className="input pr-11"
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? "Ficha nenosiri" : "Onyesha nenosiri"}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted hover:text-foreground"
        >
          <Icon name={shown ? "eyeOff" : "eye"} className="size-4" />
        </button>
      </div>
      <span className="mt-1 block text-xs text-muted">Angalau herufi {MIN_PASSWORD_LENGTH}.</span>
    </label>
  );
}
