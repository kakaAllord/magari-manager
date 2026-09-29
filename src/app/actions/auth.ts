"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { createSession, deleteSession, homeFor, type Role } from "@/lib/session";
import { normalizePlate } from "@/lib/validation";

export type LoginState = { error?: string; login?: string } | undefined;

type Candidate = { id: number; password_hash: string; role: Role };

// Managers sign in with their email; drivers with the plate of the car assigned to them.
function findAccount(login: string) {
  if (login.includes("@")) {
    return query<Candidate>(
      "SELECT id, password_hash, role FROM users WHERE email = $1 AND role = 'manager'",
      [login.toLowerCase()],
    );
  }
  return query<Candidate>(
    `SELECT u.id, u.password_hash, u.role
       FROM cars c JOIN users u ON u.id = c.driver_id
      WHERE c.plate = $1`,
    [normalizePlate(login)],
  );
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const login = String(formData.get("login") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!login || !password) return { error: "Andika namba ya gari (au barua pepe) na nenosiri.", login };

  const user = (await findAccount(login))[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return { error: "Namba ya gari, barua pepe au nenosiri si sahihi.", login };
  }

  await createSession(user.id);
  redirect(homeFor(user.role));
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
