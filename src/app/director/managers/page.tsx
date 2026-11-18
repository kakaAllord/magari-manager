import { getT } from "@/lib/lang";
import { PageHeader } from "@/components/page-header";
import { AddStaff } from "@/components/staff-forms";
import { StaffList } from "@/components/staff-list";
import { requireUser } from "@/lib/session";
import { staffAddedBy, staffManagedBy } from "@/lib/staff";

// The director adds factory managers and the mhasibu, and sees every staff member, including the
// logistics managers the factory manager adds.
export default async function ManagersPage() {
  await requireUser("director");
  const t = await getT();
  return (
    <main className="page">
      <PageHeader
        title={t("Wafanyakazi", "Staff")}
        description={t(
          "Mameneja wa kiwanda, logistics managers na wahasibu. Logistics managers wanaongezwa na meneja wa kiwanda.",
          "Factory managers, logistics managers and accountants. Logistics managers are added by the factory manager.",
        )}
        action={<AddStaff roles={staffAddedBy.director!} />}
      />
      <StaffList roles={staffManagedBy.director!} empty={t("Bado hakuna mfanyakazi. Bonyeza “Ongeza mfanyakazi”.", "No staff yet. Press “Add staff”.")} />
    </main>
  );
}
