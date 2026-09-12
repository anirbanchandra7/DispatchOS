import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrderStatusBadge } from "@/components/shared/status-badge";
import { ArrowRight } from "lucide-react";
import type { getDashboardData } from "@/lib/actions/dashboard";

type RecentOrder = Awaited<ReturnType<typeof getDashboardData>>["recentOrders"][number];

export function RecentOrdersTable({ orders }: { orders: RecentOrder[] }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold">Recent Orders</p>
        <Link href="/orders" className="text-xs font-medium text-primary flex items-center gap-0.5 hover:underline">
          View all orders <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No orders yet.</p>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">ETA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.externalOrderId}</TableCell>
                  <TableCell className="text-muted-foreground">{o.source === "UBER_EATS" ? "Uber Eats" : "Deliveroo"}</TableCell>
                  <TableCell>{o.customerName}</TableCell>
                  <TableCell>{o.itemCount} items</TableCell>
                  <TableCell>AED {o.orderValue.toFixed(2)}</TableCell>
                  <TableCell><OrderStatusBadge status={o.status} /></TableCell>
                  <TableCell className="text-right text-muted-foreground">{o.etaMinutes !== null ? `${o.etaMinutes} min` : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
