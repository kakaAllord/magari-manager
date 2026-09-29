import type { RequestStatus } from "@/lib/requests";

const styles: Record<RequestStatus, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[status]}`}>
      {status}
    </span>
  );
}
