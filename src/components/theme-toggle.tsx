"use client";

import { useState } from "react";

export type Theme = "system" | "light" | "dark";

const options: { value: Theme; label: string; icon: React.ReactNode }[] = [
  {
    value: "light",
    label: "Mwanga",
    icon: <path d="M12 4V2m0 20v-2m8-8h2M2 12h2m13.66-5.66 1.41-1.41M4.93 19.07l1.41-1.41m0-11.32L4.93 4.93m14.14 14.14-1.41-1.41M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />,
  },
  {
    value: "dark",
    label: "Giza",
    icon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />,
  },
  {
    value: "system",
    label: "Kama kifaa",
    icon: <path d="M4 5h16v11H4zM9 20h6m-3-4v4" />,
  },
];

// The choice lives in a cookie so the server renders the right theme on first paint.
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
    document.cookie = "theme=; path=/; max-age=0; samesite=lax";
  } else {
    root.setAttribute("data-theme", theme);
    document.cookie = `theme=${theme}; path=/; max-age=31536000; samesite=lax`;
  }
}

// `wide` shows labels next to the icons (sidebar); otherwise icons only.
export function ThemeToggle({ initial, wide = false }: { initial: Theme; wide?: boolean }) {
  const [theme, setTheme] = useState(initial);

  function choose(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }

  return (
    <div
      role="radiogroup"
      aria-label="Mwonekano"
      className={`flex rounded-lg border border-line bg-background p-0.5 ${wide ? "w-full" : ""}`}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={theme === o.value}
          aria-label={o.label}
          title={o.label}
          onClick={() => choose(o.value)}
          className={`flex items-center justify-center gap-1.5 rounded-md text-xs ${
            wide ? "h-8 flex-1" : "size-9 sm:size-8"
          } ${theme === o.value ? "bg-surface text-accent shadow-sm" : "text-muted hover:text-foreground"}`}
        >
          <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {o.icon}
          </svg>
          {wide && <span className="truncate">{o.label}</span>}
        </button>
      ))}
    </div>
  );
}
