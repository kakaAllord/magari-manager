import { getT } from "@/lib/lang";
import Link from "next/link";

// Reads ?page= from a page's search params; anything odd means the first page.
export function pageFrom(searchParams: Record<string, string | string[] | undefined>) {
  const n = Number(searchParams.page);
  return Number.isInteger(n) && n > 1 ? n : 1;
}

// Previous / next links that keep the page's other filters.
export async function Pager({
  page,
  total,
  pageSize,
  params = {},
}: {
  page: number;
  total: number;
  pageSize: number;
  params?: Record<string, string>;
}) {
  const t = await getT();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages === 1) return null;
  const href = (p: number) => `?${new URLSearchParams({ ...params, ...(p > 1 ? { page: String(p) } : {}) })}`;
  return (
    <nav className="flex items-center justify-between gap-3 pt-3 text-sm" aria-label={t("Kurasa", "Pages")}>
      {page > 1 ? (
        <Link href={href(page - 1)} className="btn btn-ghost">
          ← {t("Mapya zaidi", "Newer")}
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted">
        {t(`Ukurasa ${page} kati ya ${pages}`, `Page ${page} of ${pages}`)}
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} className="btn btn-ghost">
          {t("Ya zamani", "Older")} →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
