// The app speaks Kiswahili by default and English for whoever switches (the button in the header and
// on the login page). Every sentence is written in place as a pair, t("Maombi", "Requests"), so the
// Swahili stays readable where it's used and a missing English is easy to spot. Works for strings and
// for JSX alike. "Invoice" and "Payment voucher" are English in both.
// Pure, so forms, validation and tests can use it; servers get theirs from lib/lang.ts, the browser
// from components/lang-provider.tsx.

export type Lang = "sw" | "en";
export type Tr = <T>(sw: T, en: T) => T;

export const LANG_COOKIE = "lang";
export const parseLang = (value: string | undefined | null): Lang => (value === "en" ? "en" : "sw");

export const sw: Tr = (s) => s;
export const en: Tr = (_s, e) => e;
export const translator = (lang: Lang): Tr => (lang === "en" ? en : sw);
