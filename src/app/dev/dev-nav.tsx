"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dev", label: "users" },
  { href: "/dev/logs", label: "logs" },
];

export function DevNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 text-xs">
      {TABS.map((tab) => {
        const active = tab.href === "/dev" ? pathname === "/dev" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-2.5 py-1.5 transition ${
              active ? "bg-white/[0.07] text-[#e6edf3] ring-1 ring-white/10" : "text-[#8b949e] hover:text-[#e6edf3]"
            }`}
          >
            <span className={active ? "text-[#7ee787]" : "text-[#484f58]"}>./</span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
