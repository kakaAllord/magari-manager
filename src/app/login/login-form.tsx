"use client";

import { useActionState, useRef, useState } from "react";
import { login } from "@/app/actions/auth";

// Matches scripts/seed.ts. Only shown when the page passes `demo`.
const demoAccounts = [
  { who: "Dereva", name: "Juma Hassan", login: "T103ABE", password: "driver123" },
  { who: "Dereva", name: "Neema Mushi", login: "T456BCD", password: "driver123" },
  { who: "Meneja", name: "Grace Mollel", login: "manager@example.com", password: "manager123" },
];

const TYPE_DELAY_MS = 25;

export function LoginForm({ demo = false }: { demo?: boolean }) {
  const [state, action, pending] = useActionState(login, undefined);
  const loginRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const run = useRef(0);

  // Types the credentials in so people can see what goes where.
  async function fill(account: (typeof demoAccounts)[number]) {
    const id = ++run.current;
    setChosen(account.login);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (const [ref, text] of [
      [loginRef, account.login],
      [passwordRef, account.password],
    ] as const) {
      const input = ref.current;
      if (!input) return;
      input.value = "";
      for (const ch of reduced ? [text] : text) {
        if (run.current !== id) return; // another card was picked meanwhile
        input.value += ch;
        if (!reduced) await new Promise((r) => setTimeout(r, TYPE_DELAY_MS));
      }
    }
    submitRef.current?.focus();
  }

  return (
    <div className="grid gap-5">
      {demo && (
        <div className="grid gap-2">
          <p className="text-xs font-medium tracking-wide text-muted uppercase">Jaribu kama…</p>
          <div className="grid grid-cols-3 gap-2">
            {demoAccounts.map((a) => (
              <button
                key={a.login}
                type="button"
                onClick={() => fill(a)}
                aria-pressed={chosen === a.login}
                className="grid gap-0.5 rounded-lg border border-line bg-background p-2.5 text-left hover:border-accent aria-pressed:border-accent aria-pressed:bg-accent-soft"
              >
                <span className="text-[11px] font-medium tracking-wide text-muted uppercase">{a.who}</span>
                <span className="truncate text-sm font-medium">{a.name.split(" ")[0]}</span>
                <span className="truncate font-mono text-[11px] text-muted">{a.login.split("@")[0]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <form action={action} className="grid gap-4">
        <label className="block">
          <span className="label">Namba ya gari</span>
          <input
            ref={loginRef}
            name="login"
            required
            autoComplete="username"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            placeholder="T103ABE"
            defaultValue={state?.login}
            className="input font-mono tracking-wider placeholder:normal-case"
          />
          <span className="mt-1 block text-xs text-muted">Meneja: tumia barua pepe yako.</span>
        </label>
        <label className="block">
          <span className="label">Nenosiri</span>
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
          {pending ? "Inaingia…" : "Ingia"}
        </button>
      </form>
    </div>
  );
}
