import { PageHeader } from "@/components/page-header";
import { AddStaff } from "@/components/staff-forms";
import { StaffList } from "@/components/staff-list";
import { requireUser } from "@/lib/session";
import { staffAddedBy } from "@/lib/staff";

// The factory manager adds the vehicle managers, gives them new passwords and switches them off.
export default async function FactoryManagersPage() {
  await requireUser("factory_manager");
  return (
    <main className="page">
      <PageHeader
        title="Mameneja wa magari"
        description="Wanakubali maombi ya madereva, wanarekodi mapato na kusimamia magari. Ukimzima mtu hataweza kuingia, lakini jina lake linabaki kwenye historia."
        action={<AddStaff roles={staffAddedBy.factory_manager!} label="Ongeza meneja" />}
      />
      <StaffList roles={staffAddedBy.factory_manager!} empty="Bado hakuna meneja wa magari. Bonyeza “Ongeza meneja”." />
    </main>
  );
}
