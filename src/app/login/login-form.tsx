"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="grid gap-4">
      <label className="block">
        <span className="label">Namba ya gari</span>
        <input
          name="login"
          required
          autoComplete="username"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          placeholder="T103ABE"
          defaultValue={state?.login}
          className="input font-mono tracking-wider uppercase placeholder:normal-case"
        />
        <span className="mt-1 block text-xs text-muted">Meneja: tumia barua pepe yako.</span>
      </label>
      <label className="block">
        <span className="label">Nenosiri</span>
        <input name="password" type="password" required autoComplete="current-password" className="input" />
      </label>
      {state?.error && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Inaingia…" : "Ingia"}
      </button>
    </form>
  );
}
