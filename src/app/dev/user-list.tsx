"use client";

import { useState } from "react";
import { impersonate } from "@/app/actions/dev";
import type { Role } from "@/lib/session";

type Person = {
  id: number;
  name: string;
  email: string | null;
  role: Role;
  plate: string | null;
  off: boolean;
  signed_in_secs_ago: number | null;
};

const ROLES: Record<Role, { label: string; tone: string }> = {
  dev: { label: "dev", tone: "text-[#f778ba] bg-[#f778ba]/10 ring-[#f778ba]/30" },
  director: { label: "director", tone: "text-[#e3b341] bg-[#e3b341]/10 ring-[#e3b341]/30" },
  factory_manager: { label: "factory manager", tone: "text-[#ffa657] bg-[#ffa657]/10 ring-[#ffa657]/30" },
  manager: { label: "logistics manager", tone: "text-[#79c0ff] bg-[#79c0ff]/10 ring-[#79c0ff]/30" },
  accountant: { label: "accountant", tone: "text-[#7ee787] bg-[#7ee787]/10 ring-[#7ee787]/30" },
  driver: { label: "driver", tone: "text-[#d2a8ff] bg-[#d2a8ff]/10 ring-[#d2a8ff]/30" },
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

// Worked out on the server, so it renders the same on both sides.
function ago(s: number | null) {
  if (s === null) return "never signed in";
  if (s < 60) return "signed in just now";
  if (s < 3600) return `signed in ${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `signed in ${Math.floor(s / 3600)}h ago`;
  return `signed in ${Math.floor(s / 86400)}d ago`;
}

export function UserList({ users, viewingId }: { users: Person[]; viewingId: number | null }) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? users.filter((u) => [u.name, u.email, u.plate, ROLES[u.role].label].some((v) => v?.toLowerCase().includes(needle)))
    : users;

  return (
    <section className="space-y-3">
      <label className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm focus-within:border-[#7ee787]/50">
        <span className="text-[#7ee787]">grep</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="name, email, plate or role"
          aria-label="Search users"
          className="min-w-0 flex-1 bg-transparent text-[#e6edf3] outline-none placeholder:text-[#484f58]"
        />
        <span className="text-xs text-[#6e7681] tabular-nums">
          {shown.length}/{users.length}
        </span>
      </label>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((u, i) => {
          const role = ROLES[u.role];
          const viewing = viewingId === u.id;
          return (
            <li
              key={u.id}
              style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
              className={`dev-rise group flex items-center gap-3 rounded-xl border p-3 transition ${
                viewing ? "border-[#e3b341]/40 bg-[#e3b341]/[0.06]" : "border-white/[0.06] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
              }`}
            >
              <span className={`grid size-10 shrink-0 place-items-center rounded-lg text-sm font-semibold ring-1 ${role.tone}`}>{initials(u.name)}</span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-sm font-medium text-[#e6edf3]">
                  <span className="truncate">{u.name}</span>
                  {u.off && <span className="rounded bg-white/10 px-1.5 text-[10px] text-[#8b949e]">off</span>}
                  {viewing && <span className="rounded bg-[#e3b341]/20 px-1.5 text-[10px] text-[#e3b341]">viewing</span>}
                </p>
                <p className="truncate text-xs text-[#8b949e]">{u.role === "driver" ? (u.plate ?? "no car") : (u.email ?? "—")}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#6e7681]">
                  <span className={`shrink-0 rounded px-1 whitespace-nowrap ring-1 ${role.tone}`}>{role.label}</span>
                  <span className="truncate">{ago(u.signed_in_secs_ago)}</span>
                </p>
              </div>
              {u.role === "dev" ? (
                <span className="text-xs text-[#484f58]">you</span>
              ) : (
                <form action={impersonate}>
                  <input type="hidden" name="userId" value={u.id} />
                  <button
                    type="submit"
                    className="rounded-md px-2.5 py-1.5 text-xs text-[#7ee787] ring-1 ring-[#7ee787]/30 transition hover:bg-[#7ee787]/10 sm:opacity-70 sm:group-hover:opacity-100"
                  >
                    view as →
                  </button>
                </form>
              )}
            </li>
          );
        })}
      </ul>
      {shown.length === 0 && <p className="py-8 text-center text-sm text-[#6e7681]">no match for “{q}”</p>}
    </section>
  );
}
