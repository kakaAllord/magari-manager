import { LiveUpdates } from "@/components/live-updates";
import { PageHeader } from "@/components/page-header";
import { RequestHistory } from "@/components/request-history";
import { MANAGERS_CHANNEL } from "@/lib/realtime";
import { requireUser } from "@/lib/session";

export default async function ManagerHistoryPage({ searchParams }: PageProps<"/manager/history">) {
  await requireUser("manager");
  return (
    <main className="page">
      <LiveUpdates channel={MANAGERS_CHANNEL} />
      <PageHeader title="Historia" description="Maombi yote yaliyoamuliwa, ya madereva na ya mameneja wa magari, mapya juu." />
      <RequestHistory searchParams={await searchParams} filters={["all", "approved", "authorised", "issued", "rejected"]} />
    </main>
  );
}
