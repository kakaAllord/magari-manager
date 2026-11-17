import type { NavItem } from "@/components/app-shell";

export const accountantLinks: NavItem[] = [
  { href: "/accountant", label: ["Kulipa", "To pay"], icon: "money" },
  { href: "/accountant/salio", label: ["Dashibodi", "Dashboard"], icon: "dashboard" },
  { href: "/accountant/history", label: ["Historia", "History"], icon: "history" },
  { href: "/accountant/vouchers", label: ["Payment vouchers", "Payment vouchers"], icon: "pdf" },
  { href: "/accountant/reports", label: ["Ripoti", "Reports"], icon: "report" },
];
