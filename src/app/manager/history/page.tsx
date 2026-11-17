import { getT } from "@/lib/lang";
import { LiveUpdates } from "@/components/live-updates";
import { PageHeader } from "@/components/page-header";
import { RequestHistory } from "@/components/request-history";
import { MANAGERS_CHANNEL } from "@/lib/realtime";
import { requireUser } from "@/lib/session";

export default async function ManagerHistoryPage({ searchParams }: PageProps<"/manager/history">) {
  await requireUser("manager");
  const t = await getT();
  return (
    <main className="page">
      <LiveUpdates channel={MANAGERS_CHANNEL} />
      <PageHeader
        title={t("Historia", "History")}
        description={t("Maombi yote yaliyoamuliwa, ya madereva na ya mameneja, mapya juu.", "Every decided request, from drivers and managers, newest first.")}
      />
      <RequestHistory editable searchParams={await searchParams} filters={["all", "approved", "authorised", "issued", "rejected"]} />
    </main>
  );
}
