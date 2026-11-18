import { getT } from "@/lib/lang";
import { PageHeader } from "@/components/page-header";
import { AddStaff } from "@/components/staff-forms";
import { StaffList } from "@/components/staff-list";
import { requireUser } from "@/lib/session";
import { staffAddedBy } from "@/lib/staff";

// The factory manager adds the logistics managers, gives them new passwords and switches them off.
export default async function FactoryManagersPage() {
  await requireUser("factory_manager");
  const t = await getT();
  return (
    <main className="page">
      <PageHeader
        title={t("Logistics managers", "Logistics managers")}
        description={t("Wanakubali maombi ya madereva, wanatengeneza invoice (mapato) na kusimamia magari.", "They approve drivers' requests, make invoices (income) and run the cars.")}
        action={<AddStaff roles={staffAddedBy.factory_manager!} label={t("Ongeza logistics manager", "Add logistics manager")} />}
      />
      <StaffList roles={staffAddedBy.factory_manager!} empty={t("Bado hakuna logistics manager. Bonyeza “Ongeza logistics manager”.", "No logistics managers yet. Press “Add logistics manager”.")} />
    </main>
  );
}
