import { ReportView } from "@/components/report-view";
import { requireUser } from "@/lib/session";

export default async function ReportsPage({ searchParams }: PageProps<"/accountant/reports">) {
  await requireUser("accountant");
  return <ReportView base="/accountant/reports" searchParams={await searchParams} />;
}
