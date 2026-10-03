import type { NavLink } from "@/components/app-shell";

export const managerLinks: NavLink[] = [
  { href: "/manager", label: "Dashibodi", icon: "dashboard" },
  { href: "/manager/requests", label: "Maombi", icon: "inbox" },
  { href: "/manager/ask", label: "Omba pesa", icon: "send" },
  { href: "/manager/history", label: "Historia", icon: "history" },
  { href: "/manager/income", label: "Mapato", icon: "money" },
  { href: "/manager/fuel", label: "Mafuta", icon: "fuel" },
  { href: "/manager/cars", label: "Magari", icon: "car" },
  { href: "/manager/drivers", label: "Madereva", icon: "users" },
  { href: "/manager/reports", label: "Ripoti", icon: "report" },
];
