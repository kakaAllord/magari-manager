import { LiveUpdates } from "@/components/live-updates";
import { PageHeader } from "@/components/page-header";
import { RequestHistory } from "@/components/request-history";
import { MANAGERS_CHANNEL } from "@/lib/realtime";
import { requireUser } from "@/lib/session";

export default async function FactoryHistoryPage({ searchParams }: PageProps<"/factory/history">) {
  await requireUser("factory_manager");
  return (
    <main className="page">
      <LiveUpdates channel={MANAGERS_CHANNEL} />
      <PageHeader title="Historia" description="Maombi yote yaliyoamuliwa na meneja, mapya juu." />
      <RequestHistory
        searchParams={await searchParams}
        filters={["all", "approved", "authorised", "issued", "rejected"]}
      />
    </main>
  );
}
