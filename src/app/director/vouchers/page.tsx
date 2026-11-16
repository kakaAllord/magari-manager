import { VoucherList } from "@/components/voucher-list";
import { requireUser } from "@/lib/session";

export default async function DirectorVouchersPage({ searchParams }: PageProps<"/director/vouchers">) {
  await requireUser("director");
  return <VoucherList searchParams={await searchParams} />;
}
