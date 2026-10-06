import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { lastPaymentDetails } from "@/lib/invoices";
import { listCars, todayInTanzania } from "@/lib/reports";
import { requireUser } from "@/lib/session";
import { InvoiceForm } from "./invoice-form";

export default async function NewInvoicePage() {
  await requireUser("manager");
  const [cars, payment] = await Promise.all([listCars(), lastPaymentDetails()]);
  return (
    <main className="page">
      <PageHeader
        title="Ankara mpya"
        description="Namba ya ankara inawekwa yenyewe ukihifadhi."
        action={
          <Link href="/manager/invoices" className="btn btn-ghost">
            Rudi
          </Link>
        }
      />
      <InvoiceForm cars={cars} today={todayInTanzania()} payment={payment} />
    </main>
  );
}
