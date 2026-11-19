import "server-only";
import { headers } from "next/headers";
import { query } from "@/lib/db";

export type AuthEventKind = "sign_in" | "sign_in_failed" | "sign_out";

// Records a sign-in, failed sign-in or sign-out for the dev console's log. A failure here must never
// stop anyone signing in or out, so errors are only printed.
export async function logAuthEvent(kind: AuthEventKind, userId: number | null, login?: string) {
  try {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
    await query("INSERT INTO auth_events (kind, user_id, login, ip, user_agent) VALUES ($1, $2, $3, $4, $5)", [
      kind,
      userId,
      kind === "sign_in_failed" ? (login ?? "").slice(0, 120) : null,
      ip,
      h.get("user-agent")?.slice(0, 300) ?? null,
    ]);
  } catch (err) {
    console.error("auth event not logged", err);
  }
}
