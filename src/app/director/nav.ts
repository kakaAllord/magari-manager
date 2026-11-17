import type { NavItem } from "@/components/app-shell";

export const directorLinks: NavItem[] = [
  { href: "/director", label: ["Dashibodi", "Dashboard"], icon: "dashboard" },
  { href: "/director/vouchers", label: ["Payment vouchers", "Payment vouchers"], icon: "pdf" },
  { href: "/director/fuel", label: ["Mafuta", "Fuel"], icon: "fuel" },
  { href: "/director/reports", label: ["Ripoti", "Reports"], icon: "report" },
  { href: "/director/managers", label: ["Wafanyakazi", "Staff"], icon: "users" },
  { href: "/director/maoni", label: ["Maoni", "Feedback"], icon: "chat" },
];
