"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Re-fetches server data periodically so status changes show up without a manual reload.
export function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);
  return null;
}
