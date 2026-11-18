import type { NavItem } from "@/components/app-shell";

const money: NavItem["group"] = ["Fedha", "Money"];
const fleet: NavItem["group"] = ["Usafiri", "Fleet"];
const insight: NavItem["group"] = ["Taarifa", "Insights"];

export const managerLinks: NavItem[] = [
  { href: "/manager", label: ["Dashibodi", "Dashboard"], icon: "dashboard", tab: true },
  { href: "/manager/requests", label: ["Maombi", "Requests"], icon: "inbox", tab: true },
  { href: "/manager/ask", label: ["Omba pesa", "Ask for money"], icon: "send", group: money },
  { href: "/manager/income", label: ["Mapato", "Income"], icon: "money", group: money },
  { href: "/manager/invoices", label: ["Invoice", "Invoice"], icon: "receipt", group: money, tab: true },
  { href: "/manager/vouchers", label: ["Payment vouchers", "Payment vouchers"], icon: "pdf", group: money },
  { href: "/manager/history", label: ["Historia", "History"], icon: "history", group: money },
  { href: "/manager/fuel", label: ["Mafuta", "Fuel"], icon: "fuel", group: fleet, tab: true },
  { href: "/manager/cars", label: ["Magari", "Cars"], icon: "car", group: fleet },
  { href: "/manager/drivers", label: ["Madereva", "Drivers"], icon: "users", group: fleet },
  { href: "/manager/reports", label: ["Ripoti", "Reports"], icon: "report", group: insight },
  { href: "/manager/maoni", label: ["Maoni", "Feedback"], icon: "chat", group: insight },
];
