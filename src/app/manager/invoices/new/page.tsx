import { getT } from "@/lib/lang";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { lastBankDetails } from "@/lib/invoices";
import { listCars, todayInTanzania } from "@/lib/reports";
import { requireUser } from "@/lib/session";
import { InvoiceForm } from "./invoice-form";

export default async function NewInvoicePage() {
  await requireUser("manager");
  const t = await getT();
  const [cars, bank] = await Promise.all([listCars(), lastBankDetails()]);
  return (
    <main className="page">
      <PageHeader
        title={t("Invoice mpya", "New invoice")}
        description={t("Namba ya invoice inawekwa yenyewe ukihifadhi.", "The invoice number is set by itself when you save.")}
        action={
          <Link href="/manager/invoices" className="btn btn-ghost">
            {t("Rudi", "Back")}
          </Link>
        }
      />
      <InvoiceForm cars={cars} today={todayInTanzania()} bank={bank} />
    </main>
  );
}
