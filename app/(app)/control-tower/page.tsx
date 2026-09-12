export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { ControlTowerView } from "@/components/control-tower/control-tower-view";
import { getControlTowerSnapshot } from "@/lib/actions/control-tower";

export default async function ControlTowerPage() {
  const snapshot = await getControlTowerSnapshot();
  return (
    <div>
      <PageHeader title="Control Tower" description="Live operational command centre for the delivery fleet." />
      <ControlTowerView initialSnapshot={snapshot} />
    </div>
  );
}
