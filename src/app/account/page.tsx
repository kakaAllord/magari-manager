import { PageHeader } from "@/components/page-header";
import { query } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { PasswordForm } from "./password-form";

const roleName = { driver: "Dereva", manager: "Meneja", director: "Mkurugenzi" } as const;

export default async function AccountPage() {
  const user = await requireUser();
  // Drivers sign in with their car's plate, everyone else with their email.
  const plate =
    user.role === "driver"
      ? (await query<{ plate: string }>("SELECT plate FROM cars WHERE driver_id = $1", [user.id]))[0]?.plate
      : undefined;

  return (
    <main className="page">
      <PageHeader title="Akaunti yangu" description="Badilisha nenosiri lako hapa." />

      <section className="card">
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">Jina</dt>
            <dd className="font-medium">{user.name}</dd>
          </div>
          <div>
            <dt className="text-muted">Nafasi</dt>
            <dd className="font-medium">{roleName[user.role]}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted">Unaingia kwa</dt>
            <dd className="font-medium break-words">
              {user.role === "driver" ? plate ? <span className="plate">{plate}</span> : "Bado huna gari" : user.email}
            </dd>
          </div>
        </dl>
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold">Badilisha nenosiri</h2>
        <p className="mb-4 text-sm text-muted">Vifaa vingine ulivyoingia navyo vitatolewa.</p>
        <PasswordForm />
      </section>
    </main>
  );
}
