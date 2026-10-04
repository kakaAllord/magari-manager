import { FuelOverview, parseFuelTab } from "@/components/fuel-overview";
import { LiveUpdates } from "@/components/live-updates";
import { PageHeader } from "@/components/page-header";
import { getFuelOverview, parseFuelPeriod, periodRange } from "@/lib/fuel";
import { MANAGERS_CHANNEL } from "@/lib/realtime";
import { requireUser } from "@/lib/session";

export default async function FactoryFuelPage({ searchParams }: PageProps<"/factory/fuel">) {
  await requireUser("factory_manager");
  const sp = await searchParams;
  const period = parseFuelPeriod(sp.kipindi);
  const data = await getFuelOverview(periodRange(period));

  return (
    <main className="page">
      <LiveUpdates channel={MANAGERS_CHANNEL} />
      <PageHeader
        title="Mafuta"
        description="Km zilizotembewa na lita zilizotumika kati ya vipimo vya madereva, kwa kila gari na kila dereva."
      />
      <FuelOverview data={data} period={period} tab={parseFuelTab(sp.tab)} />
    </main>
  );
}
