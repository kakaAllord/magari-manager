import type { Role } from "@/lib/session";

// Staff sign in with email and are added in the app by someone above them.
export type StaffRole = "factory_manager" | "manager" | "accountant";

export const staffLabel: Record<StaffRole, string> = {
  factory_manager: "Meneja wa kiwanda",
  manager: "Meneja",
  accountant: "Mhasibu",
};

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
