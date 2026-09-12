import { checkStockForOrder } from "@/lib/inventory/reservation";
import { acceptOrder } from "@/lib/dispatch/order-actions";
import { getAppSettings } from "@/lib/store/repositories/settings-repo";
import { notify } from "@/lib/notifications/notification-service";
import { updateOrder } from "@/lib/store/repositories/orders-repo";
import type { Order } from "@/types";

const AUTO_ACCEPT_ACTOR = "Auto-Accept Engine";

export interface AutoAcceptResult {
  outcome: "AUTO_ACCEPTED" | "HELD_STOCK" | "DISABLED";
  shortages?: { sku: string; productName: string; requested: number; available: number }[];
}

/**
 * Runs immediately after a new order is ingested from a platform. If
 * auto-accept is enabled and every line item has enough stock, the order
 * is accepted (and stock reserved) automatically via the same acceptOrder()
 * used by the manual Fulfilment flow. Otherwise it's left in RECEIVED for
 * a human to review - never auto-rejected.
 */
export function autoAcceptOrder(order: Order): AutoAcceptResult {
  const settings = getAppSettings();
  if (!settings.autoAcceptEnabled) {
    return { outcome: "DISABLED" };
  }

  const shortages = checkStockForOrder(order);
  if (shortages.length > 0) {
    const summary = shortages.map((s) => `${s.productName} (need ${s.requested}, have ${s.available})`).join(", ");
    notify(
      "ORDER_HELD_STOCK",
      "Order held - stock shortage",
      `Order ${order.externalOrderId} needs manual review: ${summary}.`,
      { orderId: order.id },
    );
    return { outcome: "HELD_STOCK", shortages };
  }

  const result = acceptOrder(order.id, AUTO_ACCEPT_ACTOR);
  if (result.ok) {
    updateOrder(order.id, { autoAccepted: true }, AUTO_ACCEPT_ACTOR);
    return { outcome: "AUTO_ACCEPTED" };
  }

  // Extremely unlikely (e.g. a race where stock changed between the check
  // and the reservation) - fall back to leaving it for manual review.
  return { outcome: "HELD_STOCK", shortages: result.shortages ?? [] };
}
