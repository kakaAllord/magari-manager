"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { COMPANY } from "@/lib/company";
import { Icon } from "./icons";

// Chrome and Edge (Android, Windows, Mac, Linux) hand over this event when the app can be installed.
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

// iPhones, iPads and Safari on a Mac can't be asked from the page, so they get the steps instead.
type Kind = { install: InstallEvent } | { steps: "ios" | "mac" };

const noop = () => () => {};

function installed() {
  return (
    matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function stepsFor(): "ios" | "mac" | null {
  const ua = navigator.userAgent;
  // iPads say they are Macs; a touch screen gives them away.
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Macintosh/.test(ua) && /Version\/\d+.*Safari/.test(ua) && !/Chrome|Chromium|Edg|Firefox/.test(ua)) return "mac";
  return null;
}

// Asks in English every time the app is opened in a browser, at the bottom of the screen, to install it on the
// phone or computer. "Later" hides it only until the app is opened again. Never shows inside the installed app;
// Chrome and Edge also stop offering once it is installed. Floats over the page so nothing moves under it.
export function InstallPrompt() {
  // Everything it checks lives in the browser, so the server and the first render show nothing.
  const client = useSyncExternalStore(noop, () => true, () => false);
  const [offer, setOffer] = useState<InstallEvent | null>(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const keep = (e: Event) => {
      e.preventDefault();
      setOffer(e as InstallEvent);
    };
    const done = () => setClosed(true);
    addEventListener("beforeinstallprompt", keep);
    addEventListener("appinstalled", done);
    return () => {
      removeEventListener("beforeinstallprompt", keep);
      removeEventListener("appinstalled", done);
    };
  }, []);

  if (!client || closed || installed()) return null;
  const steps = stepsFor();
  const kind: Kind | null = steps ? { steps } : offer ? { install: offer } : null;
  if (!kind) return null;
  const phone = matchMedia("(pointer: coarse)").matches;

  const later = () => setClosed(true);

  const install = async (e: InstallEvent) => {
    await e.prompt();
    const { outcome } = await e.userChoice;
    // The browser offers the event only once; a "no" there counts as "Later".
    if (outcome === "accepted") setClosed(true);
    else later();
  };

  return (
    <div
      role="dialog"
      aria-labelledby="install-title"
      className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-30 rounded-xl border border-line bg-surface p-4 shadow-lg sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-96"
    >
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- a fixed 40px icon needs no optimising */}
        <img src="/icon.svg" alt="" className="size-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <p id="install-title" className="font-semibold">
            Install {COMPANY}
          </p>
          {"install" in kind ? (
            <p className="mt-0.5 text-sm text-muted">
              {phone
                ? "Open it straight from your phone's home screen, like any other app."
                : "Open it straight from your computer, without looking for the website."}
            </p>
          ) : kind.steps === "ios" ? (
            <p className="mt-0.5 text-sm text-muted">
              Tap the <ShareIcon /> <b className="text-foreground">Share</b> button, then choose{" "}
              <b className="text-foreground">Add to Home Screen</b>.
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-muted">
              In Safari&rsquo;s <b className="text-foreground">File</b> menu, choose{" "}
              <b className="text-foreground">Add to Dock</b>.
            </p>
          )}
        </div>
        <button type="button" onClick={later} aria-label="Close" className="-m-1 shrink-0 rounded-md p-1 hover:bg-background">
          <Icon name="close" className="size-4" />
        </button>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={later} className="btn btn-ghost">
          {"install" in kind ? "Later" : "OK"}
        </button>
        {"install" in kind && (
          <button type="button" onClick={() => install(kind.install)} className="btn btn-primary gap-2">
            <Icon name="download" className="size-4" />
            Install
          </button>
        )}
      </div>
    </div>
  );
}

// Safari's share button: a box with an arrow out of the top.
function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="inline size-4 -translate-y-0.5 fill-none stroke-current stroke-2 text-info">
      <path d="M12 3v12M8 7l4-4 4 4M6 11H5v10h14V11h-1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
