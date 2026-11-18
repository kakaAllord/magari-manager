import type { NavItem } from "@/components/app-shell";

export const driverLinks: NavItem[] = [
  { href: "/driver", label: ["Omba pesa", "Ask for money"], icon: "money", tab: true },
  { href: "/driver/history", label: ["Historia", "History"], icon: "history", tab: true },
  { href: "/driver/maoni", label: ["Maoni", "Feedback"], icon: "chat", tab: true },
];
