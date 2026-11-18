"use client";

import { useT } from "@/components/lang-provider";
import { useActionState, useRef, useState } from "react";
import { login } from "@/app/actions/auth";

// Matches scripts/seed.ts. Only shown when the page passes `demo`.
const demoAccounts = [
  { label: ["Mkurugenzi", "Director"], name: "Baraka Mushi", login: "director@example.com", password: "director123" },
  { label: ["Meneja wa kiwanda", "Factory manager"], name: "Daudi Mrema", login: "factory@example.com", password: "factory123" },
  { label: ["Logistics manager", "Logistics manager"], name: "Grace Mollel", login: "manager@example.com", password: "manager123" },
  { label: ["Mhasibu", "Accountant"], name: "Rehema Kweka", login: "accountant@example.com", password: "accountant123" },
  { label: ["Dereva 1", "Driver 1"], name: "Juma Hassan", login: "T103ABE", password: "driver123" },
  { label: ["Dereva 2", "Driver 2"], name: "Neema Mushi", login: "T456BCD", password: "driver123" },
] as const;

export function LoginForm({ demo = false }: { demo?: boolean }) {
  const t = useT();
  const [state, action, pending] = useActionState(login, undefined);
  const loginRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const [chosen, setChosen] = useState<string | null>(null);

  function fill(account: (typeof demoAccounts)[number]) {
    if (!loginRef.current || !passwordRef.current) return;
    loginRef.current.value = account.login;
    passwordRef.current.value = account.password;
    setChosen(account.login);
    submitRef.current?.focus();
  }

  return (
    <div className="grid gap-6">
      <div className="card p-5 sm:p-6">
        <form action={action} className="grid gap-4">
          <label className="block">
            <span className="label">{t("Namba ya gari au barua pepe", "Car plate or email")}</span>
            <input
              ref={loginRef}
              name="login"
              required
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              defaultValue={state?.login}
              className="input font-mono tracking-wider"
            />
          </label>
          <label className="block">
            <span className="label">{t("Nenosiri", "Password")}</span>
            <input
              ref={passwordRef}
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="input"
            />
          </label>
          {state?.error && (
            <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          )}
          <button ref={submitRef} type="submit" disabled={pending} className="btn btn-primary w-full">
            {pending ? t("Inaingia…", "Signing in…") : t("Ingia", "Sign in")}
          </button>
        </form>
      </div>

      {demo && (
        <section aria-labelledby="demo-title" className="grid gap-2">
          <p id="demo-title" className="text-center text-xs font-medium tracking-wide text-muted uppercase">
            {t("Akaunti za majaribio · gusa moja kujaza", "Demo accounts · tap one to fill in")}
          </p>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3 [&>:last-child:nth-child(odd)]:col-span-2 sm:[&>:last-child:nth-child(odd)]:col-span-1">
            {demoAccounts.map((a) => (
              <button
                key={a.login}
                type="button"
                onClick={() => fill(a)}
                aria-pressed={chosen === a.login}
                className="grid min-w-0 gap-0.5 bg-surface px-2 py-3 text-center hover:bg-background aria-pressed:bg-accent-soft"
              >
                <span className="text-sm font-semibold">{t<string>(a.label[0], a.label[1])}</span>
                <span className="truncate text-xs text-muted">{a.name.split(" ")[0]}</span>
                <span className="truncate font-mono text-[11px] text-muted">{a.login.split("@")[0]}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
