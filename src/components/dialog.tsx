"use client";

import { useEffect, useRef } from "react";
import { Icon } from "./icons";

// A native modal: centred on larger screens, a sheet from the bottom on phones. Escape, the close
// button and a tap on the backdrop all close it.
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl bg-surface p-0 text-foreground shadow-xl backdrop:bg-black/40 max-sm:mb-0 max-sm:w-full max-sm:max-w-full max-sm:rounded-b-none"
    >
      <div className="grid gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost -mt-1 -mr-1 size-11 shrink-0 p-0 sm:size-9" aria-label="Funga">
            <Icon name="close" className="size-4" />
          </button>
        </div>
        {open && children}
      </div>
    </dialog>
  );
}
