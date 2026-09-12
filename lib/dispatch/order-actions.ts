import { getOrder, updateOrder } from "@/lib/store/repositories/orders-repo";
import { reserveInventoryForOrder, releaseInventoryForOrder, forceReserveInventoryForOrder } from "@/lib/inventory/reservation";
import type { ReservationResult } from "@/lib/inventory/reservation";
import { recordAudit } from "@/lib/audit/audit-log";
import { notify } from "@/lib/notifications/notification-service";
import { updateDriver, updateOwnedVehicle } from "@/lib/store/repositories/drivers-repo";
import { updateVehicle } from "@/lib/store/repositories/vehicles-repo";

export type ActionResult = { ok: true } | { ok: false; error: string; shortages?: ReservationResult["shortages"] };

const platformLabel = (p: "UBER_EATS" | "DELIVEROO") => (p === "UBER_EATS" ? "Uber Eats" : "Deliveroo");

/**
 * Accepts an order and reserves stock. With `force: true` (the Fulfilment
 * board's "Accept Anyway"), stock is reserved regardless of shortages -
 * short items are effectively backordered rather than blocking the order.
 */
export function acceptOrder(orderId: string, actor: string, force = false): ActionResult {
  const order = getOrder(orderId);
  if (!order) return { ok: false, error: "Order not found" };
  if (order.status !== "RECEIVED") return { ok: false, error: "Order already actioned" };

  if (force) {
    forceReserveInventoryForOrder(order);
  } else {
    const reservation = reserveInventoryForOrder(order);
    if (!reservation.ok) {
      return { ok: false, error: "Insufficient stock for one or more items", shortages: reservation.shortages };
    }
  }

  updateOrder(orderId, { status: "ACCEPTED", fulfilmentStatus: "IN_PROGRESS", acceptedAt: new Date().toISOString() }, actor);
  recordAudit({ entityType: "ORDER", entityId: orderId, action: force ? "Order accepted despite stock shortage" : "Order accepted", actor });
  notify("ORDER_RECEIVED", "Order accepted", `${platformLabel(order.source)} order ${order.externalOrderId} accepted and moved to fulfilment.`, { orderId });
  return { ok: true };
}

export function rejectOrder(orderId: string, actor: string, reason: string): ActionResult {
  const order = getOrder(orderId);
  if (!order) return { ok: false, error: "Order not found" };
  if (["DELIVERED", "CANCELLED", "FAILED"].includes(order.status)) return { ok: false, error: "Order already closed" };

  // Stock is only reserved (not yet deducted) up until the driver actually
  // collects the order - see lib/dispatch/driver-actions.ts. Cancelling
  // before collection releases the reservation; cancelling after collection
  // would need a return-to-stock flow, which is out of scope here.
  if (order.status !== "RECEIVED" && !order.collectedAt) releaseInventoryForOrder(order);

  updateOrder(orderId, { status: "CANCELLED", fulfilmentStatus: "CANCELLED", cancelledAt: new Date().toISOString(), cancelReason: reason }, actor);
  recordAudit({ entityType: "ORDER", entityId: orderId, action: "Order cancelled", actor, details: reason });

  if (order.driverId) updateDriver(order.driverId, { status: "AVAILABLE", currentOrderId: undefined });
  if (order.vehicleId) {
    if (order.vehicleOwnership === "DRIVER_OWNED") updateOwnedVehicle(order.vehicleId, { status: "AVAILABLE" });
    else updateVehicle(order.vehicleId, { status: "AVAILABLE", currentDriverId: undefined });
  }
  return { ok: true };
}

export function startFulfilment(orderId: string, actor: string): ActionResult {
  const order = getOrder(orderId);
  if (!order) return { ok: false, error: "Order not found" };
  if (order.status !== "ACCEPTED") return { ok: false, error: "Order must be accepted first" };

  updateOrder(orderId, { status: "PICKING" }, actor);
  recordAudit({ entityType: "ORDER", entityId: orderId, action: "Picking started", actor });
  return { ok: true };
}

export function markOrderReady(orderId: string, actor: string): ActionResult {
  const order = getOrder(orderId);
  if (!order) return { ok: false, error: "Order not found" };
  if (!["ACCEPTED", "PICKING"].includes(order.status)) return { ok: false, error: "Order not in a pickable state" };

  updateOrder(orderId, { status: "READY", fulfilmentStatus: "READY", readyAt: new Date().toISOString() }, actor);
  recordAudit({ entityType: "ORDER", entityId: orderId, action: "Order marked ready for dispatch", actor });
  return { ok: true };
}
