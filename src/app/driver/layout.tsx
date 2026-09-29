import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/session";

export default async function DriverLayout({ children }: LayoutProps<"/driver">) {
  const user = await requireUser("driver");
  return (
    <AppShell user={user} links={[{ href: "/driver", label: "Maombi yangu", icon: "money" }]}>
      {children}
    </AppShell>
  );
}
