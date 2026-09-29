import type { RequestStatus } from "@/lib/requests";

const styles: Record<RequestStatus, string> = {
  pending: "bg-warn-soft text-warn",
  approved: "bg-ok-soft text-ok",
  rejected: "bg-danger-soft text-danger",
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[status]}`}>
      {status}
    </span>
  );
}
