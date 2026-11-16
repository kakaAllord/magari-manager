import { VoucherList } from "@/components/voucher-list";
import { requireUser } from "@/lib/session";

export default async function ManagerVouchersPage({ searchParams }: PageProps<"/manager/vouchers">) {
  await requireUser("manager");
  return <VoucherList searchParams={await searchParams} />;
}
