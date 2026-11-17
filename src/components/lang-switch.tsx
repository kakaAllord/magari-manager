import { setLang } from "@/app/actions/lang";
import { getLang } from "@/lib/lang";
import { Icon } from "./icons";

// Offers the other language, named in that language, so it can be found by someone who can't read
// the current one. A plain form: it works before the page's scripts load.
export async function LangSwitch({ variant }: { variant: "full" | "compact" | "link" }) {
  const other = (await getLang()) === "en" ? "sw" : "en";
  const name = other === "en" ? "English" : "Kiswahili";
  const code = other === "en" ? "EN" : "SW";
  const classes = {
    full: "btn btn-ghost w-full justify-start gap-2",
    compact: "btn btn-ghost gap-1.5 max-sm:h-11 max-sm:px-2.5",
    link: "inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground",
  }[variant];

  return (
    <form action={setLang} className={variant === "full" ? "w-full" : undefined}>
      <input type="hidden" name="lang" value={other} />
      <button type="submit" className={classes} lang={other} aria-label={name} title={name}>
        <Icon name="globe" className="size-4" />
        {variant === "compact" ? (
          <>
            <span className="sm:hidden">{code}</span>
            <span className="max-sm:hidden">{name}</span>
          </>
        ) : (
          <span>{name}</span>
        )}
      </button>
    </form>
  );
}
