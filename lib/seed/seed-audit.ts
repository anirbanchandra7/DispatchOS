import { newId } from "@/lib/id";
import type { AuditEntry, Order } from "@/types";

/**
 * Backfills a plausible activity trail for the seeded orders so the
 * Dashboard's Live Activity feed and each order's Activity tab aren't
 * empty on a fresh server start — mirrors what recordAudit() would have
 * written had these events happened live, just backdated to match each
 * order's own lifecycle timestamps.
 */
export function generateSeedAudit(orders: Order[]): AuditEntry[] {
  const entries: AuditEntry[] = [];

  const push = (order: Order, action: string, timestamp: string | undefined, actor = "System (seed)") => {
    if (!timestamp) return;
    entries.push({ id: newId(), entityType: "ORDER", entityId: order.id, action, actor, timestamp });
  };

  for (const order of orders) {
    push(order, `New order received from ${order.source === "UBER_EATS" ? "Uber Eats" : "Deliveroo"}`, order.orderTime, `${order.source === "UBER_EATS" ? "Uber Eats" : "Deliveroo"} Integration`);
    push(order, "Order accepted", order.acceptedAt);
    push(order, "Order marked ready for dispatch", order.readyAt);
    if (order.driverId) push(order, "Driver assigned", order.dispatchedAt ?? order.readyAt);
    if (order.vehicleId) push(order, "Vehicle assigned", order.dispatchedAt ?? order.readyAt);
    push(order, "Order dispatched", order.dispatchedAt);
    push(order, "Order collected by driver", order.collectedAt);
    push(order, "Order delivered", order.deliveredAt);
    push(order, "Order cancelled", order.cancelledAt, "Operations Manager");
    if (order.status === "FAILED") push(order, "Delivery failed", order.updatedAt);
  }

  return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
