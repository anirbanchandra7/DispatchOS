"use server";

import { ensureSeeded } from "@/lib/store/ensure-seeded";
import { pollAllPlatforms } from "@/lib/integrations";
import { addOrder } from "@/lib/store/repositories/orders-repo";
import { notify } from "@/lib/notifications/notification-service";
import { autoAcceptOrder } from "@/lib/dispatch/auto-accept";

const platformLabel = (p: "UBER_EATS" | "DELIVEROO") => (p === "UBER_EATS" ? "Uber Eats" : "Deliveroo");

/** Polls mock platform adapters for new inbound orders and ingests them. */
export async function ingestPlatformOrders() {
  ensureSeeded();
  const incoming = await pollAllPlatforms();
  for (const order of incoming) {
    addOrder(order);
    notify(
      "ORDER_RECEIVED",
      `New ${platformLabel(order.source)} order received`,
      `Order ${order.externalOrderId} from ${order.customerName} — AED ${order.orderValue.toFixed(2)}`,
      { orderId: order.id },
    );
    // Auto-accept (or hold for stock review) immediately after ingestion —
    // see lib/dispatch/auto-accept.ts for the rules.
    autoAcceptOrder(order);
  }
  return { ingested: incoming.length };
}
