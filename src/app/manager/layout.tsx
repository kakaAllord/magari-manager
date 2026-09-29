import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/session";
import { managerLinks } from "./nav";

export default async function ManagerLayout({ children }: LayoutProps<"/manager">) {
  const user = await requireUser("manager");
  return (
    <AppShell user={user} links={managerLinks}>
      {children}
    </AppShell>
  );
}
