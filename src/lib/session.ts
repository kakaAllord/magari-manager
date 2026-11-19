import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { query } from "@/lib/db";
import type { Tr } from "@/lib/i18n";

const COOKIE = "session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type Role = "driver" | "manager" | "director" | "accountant" | "factory_manager" | "dev";

// "manager" is the logistics manager (shown as that in both languages); the factory manager authorises what they approve.
// "dev" is the hidden owner account; its name never reaches the normal UI, so its label is only a fallback.
export const roleName = (role: Role, t: Tr): string =>
  ({
    driver: t("Dereva", "Driver"),
    manager: t("Logistics manager", "Logistics manager"),
    director: t("Mkurugenzi", "Director"),
    accountant: t("Mhasibu", "Accountant"),
    factory_manager: t("Meneja wa kiwanda", "Factory manager"),
    dev: "Dev",
  })[role];
export type User = { id: number; name: string; email: string | null; role: Role };

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + MAX_AGE_SECONDS * 1000);
  await query("INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)", [
    hashToken(token),
    userId,
    expiresAt,
  ]);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

// After a password change: keep the session in use, end every other one.
export async function deleteOtherSessions(userId: number) {
  const token = (await cookies()).get(COOKIE)?.value;
  await query("DELETE FROM sessions WHERE user_id = $1 AND id <> $2", [userId, token ? hashToken(token) : ""]);
}

export async function deleteSession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await query("DELETE FROM sessions WHERE id = $1", [hashToken(token)]);
  store.delete(COOKIE);
}

// What a session resolves to: the real account that signed in (`owner`), the account the app should
// act as (`user` — the impersonated one when a dev is viewing as someone, otherwise the owner), and
// whether impersonation is on. Only a dev can impersonate, so a stray target on any other session is
// ignored. Cached per request so layouts, pages and actions share one lookup.
export type Session = { owner: User; user: User; impersonating: boolean };

const loadSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const rows = await query<User & { impersonating_user_id: number | null }>(
    `SELECT u.id, u.name, u.email, u.role, s.impersonating_user_id
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.id = $1 AND s.expires_at > now() AND u.deactivated_at IS NULL`,
    [hashToken(token)],
  );
  const row = rows[0];
  if (!row) return null;
  const owner: User = { id: row.id, name: row.name, email: row.email, role: row.role };
  if (owner.role === "dev" && row.impersonating_user_id !== null) {
    const target = (
      await query<User>("SELECT id, name, email, role FROM users WHERE id = $1 AND deactivated_at IS NULL", [row.impersonating_user_id])
    )[0];
    if (target) return { owner, user: target, impersonating: true };
  }
  return { owner, user: owner, impersonating: false };
});

// The account the app acts as — the impersonated user while a dev is viewing as them. Everything
// outside the /dev area uses this, so impersonation is seamless and leaves no trace.
export const getCurrentUser = cache(async (): Promise<User | null> => (await loadSession())?.user ?? null);

// The real signed-in account and the live impersonation state, regardless of who is being viewed.
// Only the hidden /dev area reads this.
export const getSessionOwner = async (): Promise<Session | null> => loadSession();

// Use in every page and server action that needs a signed-in user of a given role.
export async function requireUser(role?: Role): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (role && user.role !== role) redirect(homeFor(user.role));
  return user;
}

// Every server action that changes data starts with this instead of requireUser. While a dev is
// viewing as someone the app is read-only: nothing is written (not even "marked as read"), and the dev
// is sent back to /dev with a note. For everyone else it is exactly requireUser.
export async function requireWriter(role?: Role): Promise<User> {
  if ((await loadSession())?.impersonating) redirect("/dev?blocked=1");
  return requireUser(role);
}

const homes: Record<Role, string> = {
  driver: "/driver",
  manager: "/manager",
  director: "/director",
  accountant: "/accountant",
  factory_manager: "/factory",
  dev: "/dev",
};
export const homeFor = (role: Role) => homes[role];

// Guards the hidden developer area. Based on the real session owner, so a dev reaches it even while
// impersonating someone; everyone else gets a 404, so the area's existence stays hidden.
export async function requireDev(): Promise<Session> {
  const session = await getSessionOwner();
  if (!session) redirect("/login");
  if (session.owner.role !== "dev") notFound();
  return session;
}

// Sets or clears who the current dev session is viewing as. Both verify the owner is a dev and act on
// the owner's own session row, so impersonation can't be forced onto anyone else and leaves the
// target's real sessions untouched. Returns false if the caller isn't a dev.
export async function setImpersonation(targetUserId: number | null): Promise<boolean> {
  const token = (await cookies()).get(COOKIE)?.value;
  const session = await loadSession();
  if (!token || session?.owner.role !== "dev") return false;
  await query("UPDATE sessions SET impersonating_user_id = $2 WHERE id = $1 AND user_id = $3", [
    hashToken(token),
    targetUserId,
    session.owner.id,
  ]);
  return true;
}
