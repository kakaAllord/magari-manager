import type { RequestStatus } from "@/lib/requests";

const styles: Record<RequestStatus, string> = {
  pending: "bg-warn-soft text-warn",
  approved: "bg-accent-soft text-accent",
  authorised: "bg-accent-soft text-accent",
  rejected: "bg-danger-soft text-danger",
  issued: "bg-ok-soft text-ok",
};

const labels: Record<RequestStatus, string> = {
  pending: "Linasubiri",
  approved: "Limekubaliwa",
  authorised: "Limeidhinishwa",
  rejected: "Limekataliwa",
  issued: "Limelipwa",
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
