import type { NavItem } from "@/components/app-shell";

export const directorLinks: NavItem[] = [
  { href: "/director", label: ["Dashibodi", "Dashboard"], icon: "dashboard", tab: true },
  { href: "/director/fuel", label: ["Mafuta", "Fuel"], icon: "fuel", tab: true },
  { href: "/director/reports", label: ["Ripoti", "Reports"], icon: "report", tab: true },
  { href: "/director/managers", label: ["Wafanyakazi", "Staff"], icon: "users", tab: true },
  { href: "/director/maoni", label: ["Maoni", "Feedback"], icon: "chat" },
];
