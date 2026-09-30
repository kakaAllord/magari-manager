import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/session";
import { accountantLinks } from "../accountant/nav";
import { directorLinks } from "../director/nav";
import { driverLinks } from "../driver/nav";
import { managerLinks } from "../manager/nav";

const linksFor = { driver: driverLinks, manager: managerLinks, director: directorLinks, accountant: accountantLinks };

// Shared by every role, so it keeps the navigation of whoever is signed in.
export default async function AccountLayout({ children }: LayoutProps<"/account">) {
  const user = await requireUser();
  return (
    <AppShell user={user} links={linksFor[user.role]}>
      {children}
    </AppShell>
  );
}
