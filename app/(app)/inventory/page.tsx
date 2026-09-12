export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { getInventory } from "@/lib/actions/inventory";

export default async function InventoryPage() {
  const items = await getInventory();
  return (
    <div>
      <PageHeader title="Inventory" description="Stock levels reserved and consumed automatically as orders are fulfilled." />
      <InventoryTable items={items} />
    </div>
  );
}
