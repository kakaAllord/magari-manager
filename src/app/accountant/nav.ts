import type { NavItem } from "@/components/app-shell";

export const accountantLinks: NavItem[] = [
  { href: "/accountant", label: ["Kulipa", "To pay"], icon: "money", tab: true },
  { href: "/accountant/salio", label: ["Dashibodi", "Dashboard"], icon: "dashboard", tab: true },
  { href: "/accountant/history", label: ["Historia", "History"], icon: "history" },
  { href: "/accountant/vouchers", label: ["Payment vouchers", "Payment vouchers"], icon: "pdf", tab: true, short: ["Vouchers", "Vouchers"] },
  { href: "/accountant/reports", label: ["Ripoti", "Reports"], icon: "report", tab: true },
];
