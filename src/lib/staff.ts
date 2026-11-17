import type { Tr } from "@/lib/i18n";
import type { Role } from "@/lib/session";

// Staff sign in with email and are added in the app by someone above them.
export type StaffRole = "factory_manager" | "manager" | "accountant";

export const staffLabel = (role: StaffRole, t: Tr): string =>
  ({
    factory_manager: t("Meneja wa kiwanda", "Factory manager"),
    manager: t("Meneja", "Vehicle manager"),
    accountant: t("Mhasibu", "Accountant"),
  })[role];

// Who adds whom: the director adds factory managers and the mhasibu, and a factory manager adds the
// vehicle managers. The director can still give anyone a new password or switch them off.
export const staffAddedBy: Partial<Record<Role, StaffRole[]>> = {
  director: ["factory_manager", "accountant"],
  factory_manager: ["manager"],
};
export const staffManagedBy: Partial<Record<Role, StaffRole[]>> = {
  director: ["factory_manager", "manager", "accountant"],
  factory_manager: ["manager"],
};
