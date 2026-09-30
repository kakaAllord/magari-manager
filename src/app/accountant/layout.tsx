import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/session";
import { accountantLinks } from "./nav";

export default async function AccountantLayout({ children }: LayoutProps<"/accountant">) {
  const user = await requireUser("accountant");
  return (
    <AppShell user={user} links={accountantLinks}>
      {children}
    </AppShell>
  );
}
