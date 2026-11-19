"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fetchLogs } from "@/app/actions/dev";
import type { LogArea, LogEntry, LogLevel } from "@/lib/dev-logs";

// A live, animated terminal over the dev log. A short boot sequence types itself out, the backlog
// scrolls past fast, the last few lines (and every new one) are typed character by character, and new
// events are polled every few seconds. Reduced motion skips the typing.

type Line =
  | (LogEntry & { boot?: false })
  | { key: string; boot: true; prompt: boolean; text: string };

type Seg = { cls: string; str: string };

const POLL_MS = 4000;
const TICK_MS = 16;
const TYPE_LAST = 6; // lines at the end of a backlog that get typed out
const BOOT_PAUSE = 14; // ticks to wait after each boot line

const LEVEL: Record<LogLevel, { label: string; cls: string }> = {
  auth: { label: "AUTH ", cls: "text-[#56d4dd]" },
  ok: { label: "OK   ", cls: "text-[#7ee787]" },
  info: { label: "INFO ", cls: "text-[#79c0ff]" },
  warn: { label: "WARN ", cls: "text-[#e3b341]" },
  error: { label: "ERROR", cls: "text-[#ff7b72]" },
  sys: { label: "SYS  ", cls: "text-[#d2a8ff]" },
};

const AREAS: (LogArea | "all")[] = ["all", "auth", "request", "income", "invoice", "staff", "fleet", "fuel", "maoni", "db"];

const tz = "Africa/Dar_es_Salaam";
const timeFmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23", timeZone: tz });
const dayFmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: tz });

function segments(line: Line): Seg[] {
  if (line.boot) {
    return line.prompt
      ? [
          { cls: "text-[#7ee787]", str: "➜ " },
          { cls: "text-[#e6edf3]", str: line.text },
        ]
      : [{ cls: "text-[#6e7681]", str: line.text }];
  }
  const level = LEVEL[line.level];
  return [
    { cls: "text-[#484f58]", str: timeFmt.format(new Date(line.at)) + " " },
    { cls: `${level.cls} font-semibold`, str: level.label + " " },
    { cls: "hidden text-[#6b8f87] sm:inline", str: line.area.padEnd(8) },
    { cls: "text-[#e6edf3] font-semibold", str: line.actor },
    { cls: line.level === "error" || line.level === "warn" ? level.cls : "text-[#a5b1bd]", str: " " + line.text },
  ];
}

const lengthOf = (line: Line) => segments(line).reduce((n, s) => n + s.str.length, 0);
const plain = (line: Line) => segments(line).map((s) => s.str).join("");
const dayOf = (line: Line) => (line.boot ? null : dayFmt.format(new Date(line.at)));

function cut(segs: Seg[], chars: number): Seg[] {
  const out: Seg[] = [];
  let left = chars;
  for (const s of segs) {
    if (left <= 0) break;
    out.push({ cls: s.cls, str: s.str.slice(0, left) });
    left -= s.str.length;
  }
  return out;
}

function bootLines(owner: string, count: number): Line[] {
  const lines: [boolean, string][] = [
    [true, `ssh ${owner}@zuraja.app`],
    [false, "connected · tls 1.3 · Africa/Dar_es_Salaam"],
    [true, "tail -f /var/log/zuraja/events.log"],
    [false, `streaming ${count} recent events…`],
  ];
  return lines.map(([prompt, text], i) => ({ key: `boot:${i}`, boot: true, prompt, text }));
}

export function Terminal({ initial, owner }: { initial: LogEntry[]; owner: string }) {
  const [lines, setLines] = useState<Line[]>(() => [...bootLines(owner || "dev", initial.length), ...initial]);
  const [progress, setProgress] = useState({ revealed: 0, chars: 0, wait: 0 });
  const [paused, setPaused] = useState(false);
  const [area, setArea] = useState<LogArea | "all">("all");
  const [grep, setGrep] = useState("");
  const [stuck, setStuck] = useState(true);
  const [clock, setClock] = useState<string>("");
  const [online, setOnline] = useState(true);

  const screen = useRef<HTMLDivElement>(null);
  const linesRef = useRef(lines);
  const matchRef = useRef<(l: Line) => boolean>(() => true);
  const reducedRef = useRef(false);

  const needle = grep.trim().toLowerCase();
  const matches = useMemo(
    () => (l: Line) => l.boot || ((area === "all" || l.area === area) && (!needle || plain(l).toLowerCase().includes(needle))),
    [area, needle],
  );

  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);
  useEffect(() => {
    matchRef.current = matches;
  }, [matches]);
  useEffect(() => {
    reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // The typing loop.
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setProgress((p) => {
        const all = linesRef.current;
        let { revealed, chars } = p;
        if (p.wait > 0) return { revealed, chars, wait: p.wait - 1 };
        while (revealed < all.length && !matchRef.current(all[revealed])) {
          revealed++;
          chars = 0;
        }
        if (revealed >= all.length) return revealed === p.revealed ? p : { revealed, chars: 0, wait: 0 };
        const line = all[revealed];
        if (reducedRef.current) return { revealed: all.length, chars: 0, wait: 0 };
        const backlog = all.length - revealed;
        if (!line.boot && backlog > TYPE_LAST) {
          return { revealed: revealed + Math.max(1, Math.ceil((backlog - TYPE_LAST) / 24)), chars: 0, wait: 0 };
        }
        chars += line.boot ? 1 + Math.round(Math.random()) : 3 + Math.floor(Math.random() * 3);
        if (chars >= lengthOf(line)) return { revealed: revealed + 1, chars: 0, wait: line.boot ? BOOT_PAUSE : 2 };
        return { revealed, chars, wait: 0 };
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [paused]);

  // Live polling. Lines already held are skipped, since the cursor is only millisecond-precise.
  useEffect(() => {
    let cancelled = false;
    const id = setInterval(async () => {
      const last = linesRef.current.findLast((l) => !l.boot);
      try {
        const fresh = await fetchLogs(last && !last.boot ? last.at : undefined);
        if (cancelled) return;
        setOnline(true);
        if (fresh.length === 0) return;
        setLines((prev) => {
          const known = new Set(prev.map((l) => l.key));
          const add = fresh.filter((l) => !known.has(l.key));
          return add.length ? [...prev, ...add] : prev;
        });
      } catch {
        if (!cancelled) setOnline(false);
      }
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // A status-bar clock in Tanzanian time.
  useEffect(() => {
    const tick = () => setClock(timeFmt.format(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Follow the output while the view is at the bottom.
  useEffect(() => {
    const el = screen.current;
    if (el && stuck) el.scrollTop = el.scrollHeight;
  }, [progress, stuck, area, needle]);

  // Only scrolling up lets go of the bottom; the terminal's own scrolling (always down) never does,
  // even when lines arrive between a scroll and its event.
  const lastTop = useRef(0);
  const onScroll = () => {
    const el = screen.current;
    if (!el) return;
    if (el.scrollTop < lastTop.current - 4) setStuck(false);
    else if (el.scrollHeight - el.scrollTop - el.clientHeight < 32) setStuck(true);
    lastTop.current = el.scrollTop;
  };

  const replay = () => {
    setProgress({ revealed: 0, chars: 0, wait: 0 });
    setPaused(false);
    setStuck(true);
  };

  const visible = lines.slice(0, progress.revealed).filter(matches);
  const typing = progress.revealed < lines.length && matches(lines[progress.revealed]) ? lines[progress.revealed] : null;
  const queued = lines.length - progress.revealed - (typing ? 1 : 0);
  const events = lines.filter((l) => !l.boot);
  const shownEvents = events.filter(matches).length;

  // A date line before the first event of each day (boot lines carry no day).
  const rendered = visible.map((line, i) => {
    const day = dayOf(line);
    const divider = day && day !== (i > 0 ? dayOf(visible[i - 1]) : null) ? day : null;
    return (
      <div key={line.key}>
        {divider && (
          <div className="my-2 flex items-center gap-3 text-[11px] text-[#484f58]">
            <span className="h-px flex-1 bg-white/[0.06]" />
            {divider}
            <span className="h-px flex-1 bg-white/[0.06]" />
          </div>
        )}
        <div className="dev-line -mx-2 rounded px-2 break-words whitespace-pre-wrap hover:bg-white/[0.03]">
          {segments(line).map((s, i) => (
            <span key={i} className={s.cls}>
              {s.str}
            </span>
          ))}
        </div>
      </div>
    );
  });

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0b0f12] shadow-[0_0_0_1px_rgba(126,231,135,0.04),0_30px_80px_-30px_rgba(126,231,135,0.25)]">
      {/* Window chrome */}
      <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] bg-[#0f1418] px-3 py-2">
        <span className="flex gap-1.5" aria-hidden>
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </span>
        <span className="truncate text-xs text-[#8b949e]">{owner || "dev"}@zuraja: ~/logs</span>
        <span className="ml-auto flex items-center gap-2 text-[11px]">
          <span className={`flex items-center gap-1.5 ${paused ? "text-[#e3b341]" : online ? "text-[#7ee787]" : "text-[#ff7b72]"}`}>
            <span className="relative flex size-2">
              {!paused && online && <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />}
              <span className="relative inline-flex size-2 rounded-full bg-current" />
            </span>
            {paused ? "PAUSED" : online ? "LIVE" : "OFFLINE"}
          </span>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="rounded px-2 py-0.5 text-[#c9d1d9] ring-1 ring-white/10 hover:bg-white/5"
          >
            {paused ? "▶ resume" : "❚❚ pause"}
          </button>
          <button type="button" onClick={replay} className="rounded px-2 py-0.5 text-[#c9d1d9] ring-1 ring-white/10 hover:bg-white/5">
            ↻ replay
          </button>
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-3 py-2">
        <div className="flex flex-wrap gap-1">
          {AREAS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setArea(a)}
              aria-pressed={area === a}
              className={`rounded px-2 py-0.5 text-[11px] transition ${
                area === a ? "bg-[#7ee787]/15 text-[#7ee787] ring-1 ring-[#7ee787]/40" : "text-[#8b949e] hover:text-[#e6edf3]"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
        <label className="ml-auto flex min-w-40 flex-1 items-center gap-2 rounded bg-black/40 px-2 py-1 text-xs ring-1 ring-white/[0.08] focus-within:ring-[#7ee787]/50 sm:max-w-64">
          <span className="text-[#7ee787]">/</span>
          <input
            value={grep}
            onChange={(e) => setGrep(e.target.value)}
            placeholder="grep…"
            aria-label="Filter log lines"
            className="min-w-0 flex-1 bg-transparent text-[#e6edf3] outline-none placeholder:text-[#484f58]"
          />
        </label>
      </div>

      {/* Screen */}
      <div className="relative">
        <div
          ref={screen}
          onScroll={onScroll}
          role="log"
          aria-live="off"
          className="h-[62dvh] min-h-80 overflow-y-auto px-4 py-3 text-[12.5px] leading-6 sm:text-[13px]"
        >
          {rendered}
          {typing ? (
            <div className="break-words whitespace-pre-wrap">
              {cut(segments(typing), progress.chars).map((s, i) => (
                <span key={i} className={s.cls}>
                  {s.str}
                </span>
              ))}
              <span className="dev-cursor ml-px inline-block h-4 w-2 translate-y-[3px] bg-[#7ee787]" />
            </div>
          ) : (
            <div>
              <span className="text-[#7ee787]">➜ </span>
              <span className="dev-cursor inline-block h-4 w-2 translate-y-[3px] bg-[#7ee787]" />
            </div>
          )}
          {progress.revealed >= lines.length && shownEvents === 0 && (
            <p className="mt-2 text-[#6e7681]">{events.length === 0 ? "-- no events yet --" : "-- nothing matches this filter --"}</p>
          )}
        </div>
        {!stuck && (
          <button
            type="button"
            onClick={() => setStuck(true)}
            className="absolute right-4 bottom-3 rounded-full bg-[#7ee787] px-3 py-1 text-xs font-semibold text-[#06210c] shadow-lg hover:brightness-110"
          >
            ↓ follow{queued > 0 ? ` · ${queued} new` : ""}
          </button>
        )}
      </div>

      {/* Status bar, tmux style */}
      <div className="flex items-center gap-3 bg-[#7ee787] px-3 py-1 text-[11px] text-[#06210c]">
        <span className="font-semibold">[zuraja]</span>
        <span>0:logs*</span>
        <span className="hidden sm:inline">
          {shownEvents}/{events.length} events{area !== "all" ? ` · ${area}` : ""}
          {needle ? ` · /${needle}` : ""}
          {paused && queued > 0 ? ` · +${queued} queued` : ""}
        </span>
        <span className="ml-auto tabular-nums">{clock} EAT</span>
      </div>
    </div>
  );
}
