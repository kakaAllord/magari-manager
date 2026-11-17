"use client";

import { useT } from "@/components/lang-provider";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/toast";

// The confirmation after Lipa, with the new voucher to open. Closing it tidies ?paid= off the URL.
export function PaidToast({ id, number }: { id: number; number: string }) {
  const t = useT();
  const router = useRouter();
  return (
    <Toast
      message={t(`Imelipwa. Payment voucher ${number} iko tayari.`, `Paid. Payment voucher ${number} is ready.`)}
      link={{ href: `/vouchers/${id}`, label: t("Pakua voucher", "Download it") }}
      onClose={() => router.replace("/accountant", { scroll: false })}
    />
  );
}
