export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { DispatchWorkflow } from "@/components/dispatch/dispatch-workflow";
import { getOrders } from "@/lib/actions/orders";

export default async function DispatchPage() {
  const orders = await getOrders();
  return (
    <div>
      <PageHeader title="Dispatch" description="Select an order, confirm allocation, and dispatch in a single flow." />
      <DispatchWorkflow initialOrders={orders} />
    </div>
  );
}
