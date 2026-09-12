export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { VehiclesTable } from "@/components/vehicles/vehicles-table";
import { getVehicles } from "@/lib/actions/vehicles";
import { getDrivers, getOwnedVehicles } from "@/lib/actions/drivers";

export default async function VehiclesPage() {
  const [vehicles, ownedVehicles, drivers] = await Promise.all([getVehicles(), getOwnedVehicles(), getDrivers()]);
  return (
    <div>
      <PageHeader title="Vehicles" description="Company fleet and driver-owned vehicles used for deliveries." />
      <VehiclesTable vehicles={vehicles} ownedVehicles={ownedVehicles} drivers={drivers} />
    </div>
  );
}
