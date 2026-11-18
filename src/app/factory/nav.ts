import type { NavItem } from "@/components/app-shell";

const manage: NavItem["group"] = ["Usimamizi", "Manage"];

export const factoryLinks: NavItem[] = [
  { href: "/factory", label: ["Dashibodi", "Dashboard"], icon: "dashboard", tab: true },
  { href: "/factory/requests", label: ["Idhini", "Authorise"], icon: "inbox", tab: true },
  { href: "/factory/vouchers", label: ["Payment vouchers", "Payment vouchers"], icon: "pdf" },
  { href: "/factory/fuel", label: ["Mafuta", "Fuel"], icon: "fuel", tab: true },
  { href: "/factory/reports", label: ["Ripoti", "Reports"], icon: "report", group: manage, tab: true },
  { href: "/factory/managers", label: ["Logistics managers", "Logistics managers"], icon: "users", group: manage },
  { href: "/factory/maoni", label: ["Maoni", "Feedback"], icon: "chat", group: manage },
];
