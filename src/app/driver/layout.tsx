import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/session";
import { driverLinks } from "./nav";

export default async function DriverLayout({ children }: LayoutProps<"/driver">) {
  const user = await requireUser("driver");
  return (
    <AppShell user={user} links={driverLinks}>
      {children}
    </AppShell>
  );
}
