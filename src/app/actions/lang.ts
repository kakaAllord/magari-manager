"use server";

import { cookies } from "next/headers";
import { LANG_COOKIE, parseLang } from "@/lib/i18n";

// The language belongs to the device, not the account: a shared office phone keeps what was picked
// on it. Setting the cookie in an action re-renders the page in place, in the new language.
export async function setLang(formData: FormData) {
  (await cookies()).set(LANG_COOKIE, parseLang(String(formData.get("lang"))), {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
