import { getOrder, updateOrder } from "@/lib/store/repositories/orders-repo";
import { getDriver, updateDriver, updateOwnedVehicle } from "@/lib/store/repositories/drivers-repo";
import { updateVehicle } from "@/lib/store/repositories/vehicles-repo";
import { deductInventoryForOrder, releaseInventoryForOrder } from "@/lib/inventory/reservation";
import { buildRoute } from "@/lib/gps/routes";
import { getActiveDeliveryRun } from "@/lib/gps/mock-gps-engine";
import { store } from "@/lib/store/data-store";
import { newId } from "@/lib/id";
import { recordAudit } from "@/lib/audit/audit-log";
import { notify } from "@/lib/notifications/notification-service";
import type { Order } from "@/types";

export type DriverActionResult = { ok: true } | { ok: false; error: string };

function releaseVehicle(order: Order) {
  if (!order.vehicleId) return;
  if (order.vehicleOwnership === "DRIVER_OWNED") updateOwnedVehicle(order.vehicleId, { status: "AVAILABLE" });
  else updateVehicle(order.vehicleId, { status: "AVAILABLE", currentDriverId: undefined });
}

function validateOwnership(order: Order, driverId: string | undefined, override: boolean): string | undefined {
  if (override) return undefined;
  if (!driverId) return "Not signed in as a driver";
  if (order.driverId !== driverId) return "This order isn't assigned to you";
  return undefined;
}

/**
 * Driver taps "Mark Collected" at the pickup location. Moves the order to
 * OUT_FOR_DELIVERY, deducts inventory (stock physically leaves the depot
 * now, not at dispatch), and rebuilds the delivery run for the pickup ->
 * customer leg. `override: true` lets a dispatcher force this from the
 * order drawer for a stuck order, skipping the "must be at pickup" check.
 */
export function markCollected(orderId: string, driverId: string | undefined, actor: string, override = false): DriverActionResult {
  const order = getOrder(orderId);
  if (!order) return { ok: false, error: "Order not found" };
  const ownershipError = validateOwnership(order, driverId, override);
  if (ownershipError) return { ok: false, error: ownershipError };
  if (order.status !== "DISPATCHED") return { ok: false, error: "Order must be dispatched before it can be collected" };

  const run = getActiveDeliveryRun(orderId);
  if (!override && (!run || run.status !== "AT_PICKUP")) {
    return { ok: false, error: "You need to arrive at the pickup location first" };
  }

  const driver = getDriver(order.driverId!);
  if (!driver) return { ok: false, error: "Driver not found" };

  const now = new Date().toISOString();
  updateOrder(orderId, { status: "OUT_FOR_DELIVERY", collectedAt: now }, actor);
  deductInventoryForOrder(order);

  const newRoute = buildRoute({ lat: order.pickupLat, lng: order.pickupLng }, { lat: order.deliveryLat, lng: order.deliveryLng }, 2);
  if (run) {
    run.routePoints = newRoute;
    run.progress = 0;
    run.status = "EN_ROUTE_CUSTOMER";
    run.lastGpsUpdate = now;
  } else {
    store.deliveryRuns.push({
      id: newId(),
      orderId,
      driverId: order.driverId!,
      routePoints: newRoute,
      progress: 0,
      startedAt: now,
      status: "EN_ROUTE_CUSTOMER",
      speedKmh: 30,
      lastGpsUpdate: now,
    });
  }

  recordAudit({ entityType: "ORDER", entityId: orderId, action: override ? "Order marked collected (dispatcher override)" : "Order collected by driver", actor });
  notify("ORDER_COLLECTED", "Order collected", `${driver.fullName} collected order ${order.externalOrderId} and is en route to the customer.`, {
    orderId,
    driverId: driver.id,
  });
  return { ok: true };
}

/**
 * Driver taps "Mark Delivered" at the customer's door. Closes the order,
 * frees the driver and vehicle, and updates delivery stats.
 */
export function markDelivered(orderId: string, driverId: string | undefined, actor: string, override = false): DriverActionResult {
  const order = getOrder(orderId);
  if (!order) return { ok: false, error: "Order not found" };
  const ownershipError = validateOwnership(order, driverId, override);
  if (ownershipError) return { ok: false, error: ownershipError };
  if (order.status !== "OUT_FOR_DELIVERY") return { ok: false, error: "Order must be collected before it can be delivered" };

  const run = getActiveDeliveryRun(orderId);
  if (!override && (!run || run.status !== "ARRIVED_AT_CUSTOMER")) {
    return { ok: false, error: "You need to arrive at the customer location first" };
  }

  const driver = getDriver(order.driverId!);
  if (!driver) return { ok: false, error: "Driver not found" };

  const now = new Date().toISOString();
  updateOrder(orderId, { status: "DELIVERED", deliveredAt: now }, actor);
  updateDriver(driver.id, {
    status: "AVAILABLE",
    currentOrderId: undefined,
    deliveryCount: driver.deliveryCount + 1,
    successfulDeliveries: driver.successfulDeliveries + 1,
  });
  releaseVehicle(order);
  if (run) {
    run.status = "DELIVERED";
    run.completedAt = now;
    run.progress = 1;
  }

  recordAudit({ entityType: "ORDER", entityId: orderId, action: override ? "Order marked delivered (dispatcher override)" : "Order delivered by driver", actor });
  notify("ORDER_DELIVERED", "Order delivered", `Order ${order.externalOrderId} has been delivered by ${driver.fullName}.`, {
    orderId,
    driverId: driver.id,
  });
  return { ok: true };
}

/** Driver taps "Can't deliver" - closes the order as FAILED. */
export function markFailed(orderId: string, driverId: string | undefined, actor: string, reason: string): DriverActionResult {
  const order = getOrder(orderId);
  if (!order) return { ok: false, error: "Order not found" };
  const ownershipError = validateOwnership(order, driverId, false);
  if (ownershipError) return { ok: false, error: ownershipError };
  if (!["DISPATCHED", "OUT_FOR_DELIVERY"].includes(order.status)) {
    return { ok: false, error: "Order is not currently out with a driver" };
  }
  if (!reason.trim()) return { ok: false, error: "A reason is required" };

  const driver = getDriver(order.driverId!);
  if (!driver) return { ok: false, error: "Driver not found" };

  // Stock was only deducted once collected; if the driver still had it
  // reserved-but-not-collected, release the reservation back to inventory.
  if (!order.collectedAt) releaseInventoryForOrder(order);

  const now = new Date().toISOString();
  updateOrder(orderId, { status: "FAILED", failureReason: reason.trim() }, actor);
  updateDriver(driver.id, {
    status: "AVAILABLE",
    currentOrderId: undefined,
    deliveryCount: driver.deliveryCount + 1,
    failedDeliveries: driver.failedDeliveries + 1,
  });
  releaseVehicle(order);
  const run = getActiveDeliveryRun(orderId);
  if (run) {
    run.status = "DELIVERED"; // closed - no longer an active run
    run.completedAt = now;
  }

  recordAudit({ entityType: "ORDER", entityId: orderId, action: "Delivery failed", actor, details: reason.trim() });
  notify("ORDER_FAILED", "Delivery failed", `${driver.fullName} was unable to deliver order ${order.externalOrderId}: ${reason.trim()}`, {
    orderId,
    driverId: driver.id,
  });
  return { ok: true };
}
