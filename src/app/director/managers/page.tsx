import { PageHeader } from "@/components/page-header";
import { AddStaff } from "@/components/staff-forms";
import { StaffList } from "@/components/staff-list";
import { requireUser } from "@/lib/session";
import { staffAddedBy, staffManagedBy } from "@/lib/staff";

// The director adds factory managers and the mhasibu, and sees every staff member, including the
// vehicle managers the factory manager adds.
export default async function ManagersPage() {
  await requireUser("director");
  return (
    <main className="page">
      <PageHeader
        title="Wafanyakazi"
        description="Mameneja wa kiwanda, mameneja wa magari na wahasibu. Mameneja wa magari wanaongezwa na meneja wa kiwanda. Ukimzima mtu hataweza kuingia, lakini jina lake linabaki kwenye historia."
        action={<AddStaff roles={staffAddedBy.director!} />}
      />
      <StaffList roles={staffManagedBy.director!} empty="Bado hakuna mfanyakazi. Bonyeza “Ongeza mfanyakazi”." />
    </main>
  );
}
