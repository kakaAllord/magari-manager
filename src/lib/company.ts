import { sw, type Tr } from "@/lib/i18n";

// The business the app runs for: in the header, on the login page, the home screen and in exports.
export const COMPANY = "Zuraja Transport and Logistics";
// The full name everywhere: it wraps in the phone header, and the phone shortens it under the home-screen icon.
export const COMPANY_SHORT = COMPANY;

// Printed under the name on invoices and payment vouchers, one line each, as on the company's paper
// invoice. Invoices follow the reader's language; the voucher keeps the Swahili lines it always had.
export const companyDetails = (t: Tr = sw): string[] => [
  t("S.L.P. 225, Muleba - Kagera", "P.O. Box 225, Muleba - Kagera"),
  t("Simu: 0754 662 419", "Phone: 0754 662 419"),
  t("Barua pepe: zurajalogistics@gmail.com", "Email: zurajalogistics@gmail.com"),
  "TIN: 111-579-253",
];
export const COMPANY_DETAILS = companyDetails();
