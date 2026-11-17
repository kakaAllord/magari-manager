"use client";

import { createContext, useContext } from "react";
import { translator, type Lang, type Tr } from "@/lib/i18n";

// The root layout reads the language cookie and hands it down, so browser components translate
// the same way the server did.
const LangContext = createContext<Lang>("sw");

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext value={lang}>{children}</LangContext>;
}

export const useLang = () => useContext(LangContext);
export const useT = (): Tr => translator(useContext(LangContext));
