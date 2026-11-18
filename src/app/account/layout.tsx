import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/session";
import { accountantLinks } from "../accountant/nav";
import { directorLinks } from "../director/nav";
import { driverLinks } from "../driver/nav";
import { factoryLinks } from "../factory/nav";
import { managerLinks } from "../manager/nav";

const linksFor = {
  driver: driverLinks,
  manager: managerLinks,
  director: directorLinks,
  accountant: accountantLinks,
  factory_manager: factoryLinks,
};

// Shared by every role, so it keeps the navigation of whoever is signed in.
export default async function AccountLayout({ children }: LayoutProps<"/account">) {
  const user = await requireUser();
  // The dev account has no staff navigation; its own area is /dev. (It only reaches here when not
  // impersonating — while impersonating, `user` is the impersonated staff member.)
  if (user.role === "dev") redirect("/dev");
  return (
    <AppShell user={user} links={linksFor[user.role]}>
      {children}
    </AppShell>
  );
}
