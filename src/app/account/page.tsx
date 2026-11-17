import { getT } from "@/lib/lang";
import { PageHeader } from "@/components/page-header";
import { query } from "@/lib/db";
import { requireUser, roleName } from "@/lib/session";
import { PasswordForm } from "./password-form";

export default async function AccountPage() {
  const user = await requireUser();
  const t = await getT();
  // Drivers sign in with their car's plate, everyone else with their email.
  const plate =
    user.role === "driver"
      ? (await query<{ plate: string }>("SELECT plate FROM cars WHERE driver_id = $1", [user.id]))[0]?.plate
      : undefined;

  return (
    <main className="page">
      <PageHeader title={t("Akaunti yangu", "My account")} description={t("Badilisha nenosiri lako hapa.", "Change your password here.")} />

      <section className="card">
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">{t("Jina", "Name")}</dt>
            <dd className="font-medium">{user.name}</dd>
          </div>
          <div>
            <dt className="text-muted">{t("Nafasi", "Position")}</dt>
            <dd className="font-medium">{roleName(user.role, t)}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted">{t("Unaingia kwa", "You sign in with")}</dt>
            <dd className="font-medium break-words">
              {user.role === "driver" ? plate ? <span className="plate">{plate}</span> : t("Bado huna gari", "No car yet") : user.email}
            </dd>
          </div>
        </dl>
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold">{t("Badilisha nenosiri", "Change password")}</h2>
        <p className="mb-4 text-sm text-muted">{t("Vifaa vingine ulivyoingia navyo vitatolewa.", "Your other signed-in devices will be signed out.")}</p>
        <PasswordForm />
      </section>
    </main>
  );
}
