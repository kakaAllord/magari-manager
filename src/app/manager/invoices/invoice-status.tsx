import type { Tr } from "@/lib/i18n";
import { getT } from "@/lib/lang";
import type { InvoiceStatus } from "@/lib/invoices";

const styles = (t: Tr): Record<InvoiceStatus, [string, string]> => ({
  open: ["bg-warn-soft text-warn", t("Haijalipwa", "Unpaid")],
  paid: ["bg-ok-soft text-ok", t("Imelipwa", "Paid")],
  cancelled: ["bg-danger-soft text-danger", t("Imefutwa", "Cancelled")],
});

export async function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const [style, label] = styles(await getT())[status];
  return <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>{label}</span>;
}
