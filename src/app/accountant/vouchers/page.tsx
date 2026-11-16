import { VoucherList } from "@/components/voucher-list";
import { requireUser } from "@/lib/session";

export default async function AccountantVouchersPage({ searchParams }: PageProps<"/accountant/vouchers">) {
  await requireUser("accountant");
  return <VoucherList searchParams={await searchParams} />;
}
