"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="label">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          defaultValue={state?.email}
          className="input"
        />
      </label>
      <label className="block">
        <span className="label">Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="input"
        />
      </label>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
