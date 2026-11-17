"use client";

import { useRouter } from "next/navigation";
import { Toast } from "@/components/toast";

// The confirmation after Lipa, with the new voucher to open. Closing it tidies ?paid= off the URL.
export function PaidToast({ id, number }: { id: number; number: string }) {
  const router = useRouter();
  return (
    <Toast
      message={`Imelipwa. Payment voucher ${number} iko tayari.`}
      link={{ href: `/vouchers/${id}`, label: "Pakua hati" }}
      onClose={() => router.replace("/accountant", { scroll: false })}
    />
  );
}
