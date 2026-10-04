import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/session";
import { factoryLinks } from "./nav";

export default async function FactoryLayout({ children }: LayoutProps<"/factory">) {
  const user = await requireUser("factory_manager");
  return (
    <AppShell user={user} links={factoryLinks}>
      {children}
    </AppShell>
  );
}
