import type { RequestStatus } from "@/lib/requests";

const styles: Record<RequestStatus, string> = {
  pending: "bg-warn-soft text-warn",
  approved: "bg-ok-soft text-ok",
  rejected: "bg-danger-soft text-danger",
};

const labels: Record<RequestStatus, string> = {
  pending: "Linasubiri",
  approved: "Limekubaliwa",
  rejected: "Limekataliwa",
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
