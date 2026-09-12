export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { OrdersTable } from "@/components/orders/orders-table";
import { getOrders } from "@/lib/actions/orders";

export default async function OrdersPage() {
  const orders = await getOrders();
  return (
    <div>
      <PageHeader title="Orders" description="All orders across every platform, from receipt to delivery." />
      <OrdersTable initialOrders={orders} />
    </div>
  );
}
