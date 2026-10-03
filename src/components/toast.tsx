"use client";

import { useEffect, useEffectEvent } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icons";

const tones = {
  ok: "border-ok/30 bg-ok-soft text-ok",
  warn: "border-warn/30 bg-warn-soft text-warn",
};

// One shared spot for every toast, so two at once stack instead of covering each other.
function toastRoot() {
  let root = document.getElementById("toasts");
  if (!root) {
    root = document.createElement("div");
    root.id = "toasts";
    root.className =
      "pointer-events-none fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-40 flex flex-col gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-96";
    document.body.append(root);
  }
  return root;
}

// A confirmation that floats over the page (bottom of the screen on phones, bottom right on larger
// screens) and goes away by itself, so it never pushes buttons or lists around. Toasts only appear
// after something is saved, so they never render on the server.
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

  return createPortal(
    <div
      role="status"
      className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${tones[tone]}`}
    >
      <p className="min-w-0 flex-1 break-words">{message}</p>
      <button type="button" onClick={onClose} aria-label="Funga" className="-m-1 shrink-0 rounded-md p-1 hover:bg-black/5">
        <Icon name="close" className="size-4" />
      </button>
    </div>,
    toastRoot(),
  );
}
