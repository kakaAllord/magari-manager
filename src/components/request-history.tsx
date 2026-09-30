import Link from "next/link";
import { Pager, pageFrom } from "@/components/pager";
import { RequestSummary } from "@/components/request-item";
import { StatusBadge } from "@/components/status-badge";
import { listCars } from "@/lib/reports";
import { listHistory, PAGE_SIZE, type HistoryFilter } from "@/lib/requests";

const filterLabels: Record<HistoryFilter, string> = {
  all: "Yote",
  approved: "Yanasubiri mhasibu",
  issued: "Yamelipwa",
  rejected: "Yamekataliwa",
};

type SearchParams = Record<string, string | string[] | undefined>;

// A paged list of requests past the manager's decision, filterable by status and car.
// `filters` lists the status chips to offer; with one, that status is fixed and no chips show.
export async function RequestHistory({
  searchParams,
  filters,
  requesterId,
  mine = false,
  carFilter = true,
}: {
  searchParams: SearchParams;
  filters: HistoryFilter[];
  requesterId?: number;
  mine?: boolean;
  carFilter?: boolean;
}) {
  const page = pageFrom(searchParams);
  const asked = String(searchParams.status ?? "") as HistoryFilter;
  const filter = filters.includes(asked) ? asked : filters[0];
  const carId = carFilter ? Number(searchParams.car) || null : null;
  const [cars, { rows, total }] = await Promise.all([
    carFilter ? listCars() : [],
    listHistory({ page, filter, carId, requesterId }),
  ]);
  const params = {
    ...(filter !== filters[0] ? { status: filter } : {}),
    ...(carId ? { car: String(carId) } : {}),
  };

  return (
    <section className="card grid gap-3">
      <form method="get" className="flex flex-wrap items-center gap-2">
        {filters.length > 1 &&
          filters.map((f) => (
            <Link
              key={f}
              href={`?${new URLSearchParams({ ...(f !== filters[0] ? { status: f } : {}), ...(carId ? { car: String(carId) } : {}) })}`}
              className={`chip ${f === filter ? "chip-on" : ""}`}
              aria-current={f === filter ? "true" : undefined}
            >
              {filterLabels[f]}
            </Link>
          ))}
        {carFilter && (
          <>
            {filter !== filters[0] && <input type="hidden" name="status" value={filter} />}
            <select
              name="car"
              defaultValue={carId ?? ""}
              aria-label="Gari"
              className="input w-auto min-w-0 flex-1 sm:flex-none"
            >
              <option value="">Magari yote</option>
              {cars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.plate}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn-ghost">
              Chuja
            </button>
          </>
        )}
      </form>
      <p className="text-sm text-muted">{total === 1 ? "Ombi 1" : `Maombi ${total}`}</p>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Hakuna ombi hapa.</p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <li key={r.id} className="flex items-start gap-4 py-3.5">
              <RequestSummary request={r} mine={mine} />
              <StatusBadge status={r.status} />
            </li>
          ))}
        </ul>
      )}
      <Pager page={page} total={total} pageSize={PAGE_SIZE} params={params} />
    </section>
  );
}
