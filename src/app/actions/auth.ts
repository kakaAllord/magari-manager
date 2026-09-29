"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { createSession, deleteSession, homeFor, type Role } from "@/lib/session";

export type LoginState = { error?: string; email?: string } | undefined;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password.", email };

  const rows = await query<{ id: number; password_hash: string; role: Role }>(
    "SELECT id, password_hash, role FROM users WHERE email = $1",
    [email],
  );
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return { error: "Wrong email or password.", email };
  }

  await createSession(user.id);
  redirect(homeFor(user.role));
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
