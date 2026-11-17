import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { LANG_COOKIE, parseLang, translator, type Lang, type Tr } from "@/lib/i18n";

// The language the person chose on this device, read once per request.
export const getLang = cache(async (): Promise<Lang> => parseLang((await cookies()).get(LANG_COOKIE)?.value));
export const getT = async (): Promise<Tr> => translator(await getLang());
