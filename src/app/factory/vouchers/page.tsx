import { VoucherList } from "@/components/voucher-list";
import { requireUser } from "@/lib/session";

export default async function FactoryVouchersPage({ searchParams }: PageProps<"/factory/vouchers">) {
  await requireUser("factory_manager");
  return <VoucherList searchParams={await searchParams} />;
}
