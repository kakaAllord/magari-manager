import { redirect } from "next/navigation";
import { BrandMark } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser, homeFor } from "@/lib/session";
import { getTheme } from "@/lib/theme";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="absolute top-3 right-3">
        <ThemeToggle initial={await getTheme()} />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark className="size-14" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Karibu Magari</h1>
          <p className="mt-1 text-sm text-muted">
            Dereva: ingia kwa namba ya gari lako na nenosiri ulilopewa na meneja.
          </p>
        </div>
        <div className="card p-5 sm:p-6">
          <LoginForm />
        </div>
        {process.env.NODE_ENV !== "production" && (
          <div className="mt-6 rounded-lg border border-dashed border-line p-3 text-xs text-muted">
            <p className="font-medium text-foreground">Akaunti za majaribio</p>
            <p>Madereva: T103ABE au T456BCD / driver123</p>
            <p>Meneja: manager@example.com / manager123</p>
          </div>
        )}
      </div>
    </main>
  );
}
