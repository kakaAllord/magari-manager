import { ReportView } from "@/components/report-view";
import { requireUser } from "@/lib/session";

export default async function ReportsPage({ searchParams }: PageProps<"/factory/reports">) {
  await requireUser("factory_manager");
  return <ReportView base="/factory/reports" searchParams={await searchParams} />;
}
