import { setLang } from "@/app/actions/lang";
import { getLang } from "@/lib/lang";
import type { Lang } from "@/lib/i18n";
import { Icon } from "./icons";

const options: { lang: Lang; code: string; name: string }[] = [
  { lang: "sw", code: "SW", name: "Kiswahili" },
  { lang: "en", code: "EN", name: "English" },
];

// A two-part SW | EN pill with the current language filled in, so it says both what's on and what
// else there is. Each half names its language in that language (title and screen readers), for
// someone who can't read the current one. A plain form: it works before the page's scripts load.
// `row` puts a globe and "Lugha / Language" in front of it, for menus.
export async function LangSwitch({ variant = "pill" }: { variant?: "pill" | "row" }) {
  const current = await getLang();

  const pill = (
    <form action={setLang} className="inline-flex shrink-0 rounded-full border border-line bg-background p-0.5" role="group" aria-label="Lugha / Language">
      {options.map((o) => {
        const on = o.lang === current;
        return (
          <button
            key={o.lang}
            type="submit"
            name="lang"
            value={o.lang}
            lang={o.lang}
            title={o.name}
            aria-label={o.name}
            aria-pressed={on}
            className={`min-h-9 min-w-11 rounded-full px-3 text-xs font-semibold tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent sm:min-h-7 sm:min-w-10 ${
              on ? "bg-accent text-accent-fg shadow-sm" : "text-muted hover:text-foreground"
            }`}
          >
            {o.code}
          </button>
        );
      })}
    </form>
  );

  if (variant === "pill") return pill;
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-1.5">
      <span className="flex items-center gap-2.5 text-sm">
        <Icon name="globe" className="size-4 text-muted" />
        {current === "en" ? "Language" : "Lugha"}
      </span>
      {pill}
    </div>
  );
}
