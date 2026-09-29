import { redirect } from "next/navigation";
import { BrandMark } from "@/components/icons";
import { getCurrentUser, homeFor } from "@/lib/session";
import { LoginForm } from "./login-form";

// Demo logins show unless DEMO_MODE=0 (set that once the site is used for real).
const showDemo = () => process.env.DEMO_MODE !== "0";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark className="size-14" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Karibu</h1>
          <p className="mt-1 text-sm text-muted">
            Dereva: ingia kwa namba ya gari lako na nenosiri ulilopewa na meneja.
          </p>
        </div>
        <LoginForm demo={showDemo()} />
      </div>
    </main>
  );
}
