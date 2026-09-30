import { reportResponse } from "@/lib/report-export";
import { requireUser } from "@/lib/session";

export async function GET(request: Request) {
  await requireUser("director");
  return reportResponse(request);
}
