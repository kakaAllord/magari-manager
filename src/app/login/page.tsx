import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser, homeFor } from "@/lib/session";
import { getTheme } from "@/lib/theme";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
      <div className="fixed top-3 right-3">
        <ThemeToggle initial={await getTheme()} />
      </div>
      <h1 className="text-2xl font-semibold">Car Manager</h1>
      <p className="mb-6 mt-1 text-sm text-muted">
        Drivers sign in with their car&apos;s plate number and the password from their manager.
      </p>
      <div className="card">
        <LoginForm />
      </div>
      {process.env.NODE_ENV !== "production" && (
        <div className="mt-6 text-xs text-muted">
          <p className="font-medium">Demo accounts</p>
          <p>Drivers: T103ABE or T456BCD / driver123</p>
          <p>Manager: manager@example.com / manager123</p>
        </div>
      )}
    </main>
  );
}
