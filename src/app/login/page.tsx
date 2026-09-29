import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/session";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold">Car Manager</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Sign in as a driver or a manager.</p>
      <div className="card">
        <LoginForm />
      </div>
      <div className="mt-6 text-xs text-muted">
        <p className="font-medium">Demo accounts</p>
        <p>Manager: manager@example.com / manager123</p>
        <p>Drivers: alice@example.com, bob@example.com / driver123</p>
      </div>
    </main>
  );
}
