import { getT } from "@/lib/lang";
import { LiveUpdates } from "@/components/live-updates";
import { PageHeader } from "@/components/page-header";
import { RequestHistory } from "@/components/request-history";
import { driverChannel } from "@/lib/realtime";
import { requireUser } from "@/lib/session";

export default async function DriverHistoryPage({ searchParams }: PageProps<"/driver/history">) {
  const user = await requireUser("driver");
  const t = await getT();
  return (
    <main className="page">
      <LiveUpdates channel={driverChannel(user.id)} />
      <PageHeader title={t("Historia", "History")} description={t("Maombi yako yote, mapya juu.", "All your requests, newest first.")} />
      <RequestHistory
        searchParams={await searchParams}
        filters={["all", "approved", "authorised", "issued", "rejected"]}
        requesterId={user.id}
        mine
        carFilter={false}
      />
    </main>
  );
}
