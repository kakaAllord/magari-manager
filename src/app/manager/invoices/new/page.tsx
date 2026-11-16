import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { lastBankDetails } from "@/lib/invoices";
import { listCars, todayInTanzania } from "@/lib/reports";
import { requireUser } from "@/lib/session";
import { InvoiceForm } from "./invoice-form";

export default async function NewInvoicePage() {
  await requireUser("manager");
  const [cars, bank] = await Promise.all([listCars(), lastBankDetails()]);
  return (
    <main className="page">
      <PageHeader
        title="Invoice mpya"
        description="Namba ya invoice inawekwa yenyewe ukihifadhi."
        action={
          <Link href="/manager/invoices" className="btn btn-ghost">
            Rudi
          </Link>
        }
      />
      <InvoiceForm cars={cars} today={todayInTanzania()} bank={bank} />
    </main>
  );
}
