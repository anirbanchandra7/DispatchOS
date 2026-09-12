export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { DriversTable } from "@/components/drivers/drivers-table";
import { getDrivers } from "@/lib/actions/drivers";

export default async function DriversPage() {
  const drivers = await getDrivers();
  return (
    <div>
      <PageHeader title="Drivers" description="Fleet of riders and drivers, their documents, and current status." />
      <DriversTable drivers={drivers} />
    </div>
  );
}
