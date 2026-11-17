import type { NavItem } from "@/components/app-shell";

export const factoryLinks: NavItem[] = [
  { href: "/factory", label: ["Dashibodi", "Dashboard"], icon: "dashboard" },
  { href: "/factory/requests", label: ["Idhini", "Authorise"], icon: "inbox" },
  { href: "/factory/vouchers", label: ["Payment vouchers", "Payment vouchers"], icon: "pdf" },
  { href: "/factory/fuel", label: ["Mafuta", "Fuel"], icon: "fuel" },
  { href: "/factory/reports", label: ["Ripoti", "Reports"], icon: "report" },
  { href: "/factory/managers", label: ["Mameneja", "Managers"], icon: "users" },
  { href: "/factory/maoni", label: ["Maoni", "Feedback"], icon: "chat" },
];
