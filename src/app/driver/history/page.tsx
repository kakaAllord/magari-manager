import { LiveUpdates } from "@/components/live-updates";
import { PageHeader } from "@/components/page-header";
import { RequestHistory } from "@/components/request-history";
import { driverChannel } from "@/lib/realtime";
import { requireUser } from "@/lib/session";

export default async function DriverHistoryPage({ searchParams }: PageProps<"/driver/history">) {
  const user = await requireUser("driver");
  return (
    <main className="page">
      <LiveUpdates channel={driverChannel(user.id)} />
      <PageHeader title="Historia" description="Maombi yako yote, mapya juu." />
      <RequestHistory
        searchParams={await searchParams}
        filters={["all", "approved", "issued", "rejected"]}
        requesterId={user.id}
        mine
        carFilter={false}
      />
    </main>
  );
}
