import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/session";
import { directorLinks } from "./nav";

export default async function DirectorLayout({ children }: LayoutProps<"/director">) {
  const user = await requireUser("director");
  return (
    <AppShell user={user} links={directorLinks}>
      {children}
    </AppShell>
  );
}
