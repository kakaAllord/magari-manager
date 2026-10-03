"use client";

import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "./icons";

export type RowMenuItem = { label: string; icon: IconName; tone?: "danger" | "ok"; onSelect: () => void };

const tones = { danger: "text-danger", ok: "text-ok" };

// The "⋯" button at the end of a list row and its small menu. A tap outside closes it.
export function RowMenu({ label, items }: { label: string; items: RowMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div ref={wrapper} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        className="btn btn-ghost size-10 rounded-full p-0 sm:size-9"
      >
        <Icon name="more" className="size-5" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1 grid w-56 rounded-xl border border-line bg-surface p-1 shadow-lg">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-background ${item.tone ? tones[item.tone] : ""}`}
            >
              <Icon name={item.icon} className={`size-4 ${item.tone ? "" : "text-muted"}`} />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
