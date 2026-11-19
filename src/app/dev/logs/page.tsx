import { readLogs } from "@/lib/dev-logs";
import { requireDev } from "@/lib/session";
import { Terminal } from "./terminal";

export const dynamic = "force-dynamic";

export default async function DevLogs() {
  const session = await requireDev();
  const initial = await readLogs({ limit: 300 });

  return (
    <div className="space-y-4">
      <section>
        <p className="text-xs text-[#6e7681]">
          <span className="text-[#7ee787]">$</span> tail -f /var/log/zuraja/events.log
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-[#e6edf3]">Logs</h1>
        <p className="mt-1 max-w-2xl text-sm text-[#8b949e]">
          Sign-ins and everything people did in the app, newest at the bottom. New lines stream in by themselves.
        </p>
      </section>
      <Terminal initial={initial} owner={session.owner.name.toLowerCase().replace(/\s+/g, "")} />
    </div>
  );
}
