import "server-only";
import { query } from "@/lib/db";
import type { Role } from "@/lib/session";

export type DevUser = {
  id: number;
  name: string;
  email: string | null;
  role: Role;
  // A driver's car plate, so they can be told apart; null for staff and unassigned drivers.
  plate: string | null;
  off: boolean;
};

// Every account, for the dev console: staff first, then drivers, by name. Switched-off accounts are
// included (and marked) so the dev can view the app as them too.
export function listAllUsers() {
  return query<DevUser>(
    `SELECT u.id, u.name, u.email, u.role, c.plate, u.deactivated_at IS NOT NULL AS off
       FROM users u LEFT JOIN cars c ON c.driver_id = u.id
      ORDER BY array_position(ARRAY['dev','director','factory_manager','manager','accountant','driver'], u.role), u.name`,
  );
}
