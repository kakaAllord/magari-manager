import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";

// The director no longer sees payment vouchers; an old link or bookmark lands on the reports.
export default async function DirectorVouchersPage() {
  await requireUser("director");
  redirect("/director/reports");
}
