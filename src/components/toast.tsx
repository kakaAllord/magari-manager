"use client";

import { useEffect, useEffectEvent } from "react";
import { Icon } from "./icons";

const tones = {
  ok: "border-ok/30 bg-ok-soft text-ok",
  warn: "border-warn/30 bg-warn-soft text-warn",
};

// A confirmation that floats over the page (bottom of the screen on phones, bottom right on larger
// screens) and goes away by itself, so it never pushes buttons or lists around.
export function Toast({
  message,
  tone = "ok",
  onClose,
}: {
  message: string;
  tone?: keyof typeof tones;
  onClose: () => void;
}) {
  const close = useEffectEvent(onClose);
  useEffect(() => {
    const timer = setTimeout(close, 8000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      role="status"
      className={`fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-40 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-96 ${tones[tone]}`}
    >
      <p className="min-w-0 flex-1 break-words">{message}</p>
      <button type="button" onClick={onClose} aria-label="Funga" className="-m-1 shrink-0 rounded-md p-1 hover:bg-black/5">
        <Icon name="close" className="size-4" />
      </button>
    </div>
  );
}
