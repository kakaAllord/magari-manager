import { ReportView } from "@/components/report-view";
import { requireUser } from "@/lib/session";

export default async function ReportsPage({ searchParams }: PageProps<"/director/reports">) {
  await requireUser("director");
  return <ReportView base="/director/reports" searchParams={await searchParams} />;
}
