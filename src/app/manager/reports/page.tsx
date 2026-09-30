import { ReportView } from "@/components/report-view";
import { requireUser } from "@/lib/session";

export default async function ReportsPage({ searchParams }: PageProps<"/manager/reports">) {
  await requireUser("manager");
  return <ReportView base="/manager/reports" searchParams={await searchParams} />;
}
