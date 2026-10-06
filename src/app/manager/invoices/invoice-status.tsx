import type { InvoiceStatus } from "@/lib/invoices";

const styles: Record<InvoiceStatus, [string, string]> = {
  open: ["bg-warn-soft text-warn", "Haijalipwa"],
  paid: ["bg-ok-soft text-ok", "Imelipwa"],
  cancelled: ["bg-danger-soft text-danger", "Imefutwa"],
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const [style, label] = styles[status];
  return <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>{label}</span>;
}
