import { getT } from "@/lib/lang";
import { FuelOverview, parseFuelTab } from "@/components/fuel-overview";
import { LiveUpdates } from "@/components/live-updates";
import { PageHeader } from "@/components/page-header";
import { getFuelOverview, parseFuelPeriod, periodRange } from "@/lib/fuel";
import { MANAGERS_CHANNEL } from "@/lib/realtime";
import { requireUser } from "@/lib/session";

export default async function FactoryFuelPage({ searchParams }: PageProps<"/factory/fuel">) {
  await requireUser("factory_manager");
  const t = await getT();
  const sp = await searchParams;
  const period = parseFuelPeriod(sp.kipindi);
  const data = await getFuelOverview(periodRange(period));

  return (
    <main className="page">
      <LiveUpdates channel={MANAGERS_CHANNEL} />
      <PageHeader
        title={t("Mafuta", "Fuel")}
        description={t(
          "Km zilizotembewa na lita zilizotumika kati ya vipimo vya madereva, kwa kila gari na kila dereva.",
          "Km driven and litres used between drivers' readings, for every car and every driver.",
        )}
      />
      <FuelOverview data={data} period={period} tab={parseFuelTab(sp.tab)} />
    </main>
  );
}
