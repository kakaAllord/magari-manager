import { getT } from "@/lib/lang";
import type { RequestStatus } from "@/lib/requests";

const styles: Record<RequestStatus, string> = {
  pending: "bg-warn-soft text-warn",
  approved: "bg-accent-soft text-accent",
  authorised: "bg-accent-soft text-accent",
  rejected: "bg-danger-soft text-danger",
  issued: "bg-ok-soft text-ok",
};

export async function StatusBadge({ status }: { status: RequestStatus }) {
  const t = await getT();
  const labels: Record<RequestStatus, string> = {
    pending: t("Linasubiri", "Pending"),
    approved: t("Limekubaliwa", "Approved"),
    authorised: t("Limeidhinishwa", "Authorised"),
    rejected: t("Limekataliwa", "Declined"),
    issued: t("Limelipwa", "Paid"),
  };
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
