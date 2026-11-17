import { getT } from "@/lib/lang";
import { LiveUpdates } from "@/components/live-updates";
import { PageHeader } from "@/components/page-header";
import { RequestHistory } from "@/components/request-history";
import { MANAGERS_CHANNEL } from "@/lib/realtime";
import { requireUser } from "@/lib/session";

export default async function AccountantHistoryPage({ searchParams }: PageProps<"/accountant/history">) {
  await requireUser("accountant");
  const t = await getT();
  return (
    <main className="page">
      <LiveUpdates channel={MANAGERS_CHANNEL} />
      <PageHeader title={t("Historia", "History")} description={t("Malipo yote yaliyotolewa, mapya juu.", "Every payment made, newest first.")} />
      <RequestHistory searchParams={await searchParams} filters={["issued"]} />
    </main>
  );
}
