import type { NavItem } from "@/components/app-shell";

export const managerLinks: NavItem[] = [
  { href: "/manager", label: ["Dashibodi", "Dashboard"], icon: "dashboard" },
  { href: "/manager/requests", label: ["Maombi", "Requests"], icon: "inbox" },
  { href: "/manager/ask", label: ["Omba pesa", "Ask for money"], icon: "send" },
  { href: "/manager/history", label: ["Historia", "History"], icon: "history" },
  { href: "/manager/vouchers", label: ["Payment vouchers", "Payment vouchers"], icon: "pdf" },
  { href: "/manager/income", label: ["Mapato", "Income"], icon: "money" },
  { href: "/manager/invoices", label: ["Invoice", "Invoice"], icon: "receipt" },
  { href: "/manager/fuel", label: ["Mafuta", "Fuel"], icon: "fuel" },
  { href: "/manager/cars", label: ["Magari", "Cars"], icon: "car" },
  { href: "/manager/drivers", label: ["Madereva", "Drivers"], icon: "users" },
  { href: "/manager/reports", label: ["Ripoti", "Reports"], icon: "report" },
  { href: "/manager/maoni", label: ["Maoni", "Feedback"], icon: "chat" },
];
