import { store } from "@/lib/store/data-store";
import { pointAlongRoute, routeLengthKm } from "@/lib/geo";
import { getDriver, updateDriver } from "@/lib/store/repositories/drivers-repo";
import { getOrder, updateOrder } from "@/lib/store/repositories/orders-repo";
import { notify } from "@/lib/notifications/notification-service";
import type { DeliveryRun, GpsLocation } from "@/types";

let lastTickAt = Date.now();

/**
 * Advances every active delivery run along its current leg's route based
 * on elapsed wall-clock time and the driver's simulated speed.
 *
 * This engine only ever *moves* drivers and *parks* a run at the end of a
 * leg (AT_PICKUP / ARRIVED_AT_CUSTOMER) - it never advances order status or
 * completes a delivery on its own. Collection and delivery are driver
 * actions (see lib/dispatch/driver-actions.ts) so the order lifecycle
 * always reflects something a human actually did.
 */
export function tickGpsEngine() {
  const now = Date.now();
  const elapsedHours = (now - lastTickAt) / (1000 * 60 * 60);
  lastTickAt = now;

  const activeRuns = store.deliveryRuns.filter((r) => r.status === "EN_ROUTE_PICKUP" || r.status === "EN_ROUTE_CUSTOMER");

  for (const run of activeRuns) {
    const totalKm = routeLengthKm(run.routePoints);
    if (totalKm <= 0) continue;
    const kmThisTick = run.speedKmh * elapsedHours;
    const progressDelta = kmThisTick / totalKm;
    const wasBelowOne = run.progress < 1;
    run.progress = Math.min(1, run.progress + progressDelta);
    run.lastGpsUpdate = new Date().toISOString();

    const { point } = pointAlongRoute(run.routePoints, run.progress);
    updateDriver(run.driverId, { currentLat: point.lat, currentLng: point.lng });
    // small natural speed variation
    run.speedKmh = Math.max(15, Math.min(55, run.speedKmh + (Math.random() - 0.5) * 4));

    if (run.progress >= 1 && wasBelowOne) {
      arriveAtLegEnd(run);
    }
  }
}

function arriveAtLegEnd(run: DeliveryRun) {
  const order = getOrder(run.orderId);
  const driver = getDriver(run.driverId);
  if (!order || !driver) return;

  if (run.status === "EN_ROUTE_PICKUP") {
    run.status = "AT_PICKUP";
    updateOrder(order.id, { arrivedAtPickupAt: new Date().toISOString() }, "Mock GPS Engine");
    notify("DRIVER_ARRIVED", "Driver arrived at pickup", `${driver.fullName} has arrived at ${order.pickupName} for order ${order.externalOrderId}.`, {
      orderId: order.id,
      driverId: driver.id,
    });
  } else if (run.status === "EN_ROUTE_CUSTOMER") {
    run.status = "ARRIVED_AT_CUSTOMER";
    notify("DRIVER_ARRIVED", "Driver arrived at customer", `${driver.fullName} has arrived at the customer for order ${order.externalOrderId}.`, {
      orderId: order.id,
      driverId: driver.id,
    });
  }
}

export function getActiveDriverLocations(): GpsLocation[] {
  return store.drivers
    .filter((d) => d.status === "BUSY" || d.status === "AVAILABLE")
    .map((d) => ({
      driverId: d.id,
      lat: d.currentLat,
      lng: d.currentLng,
      speedKmh: store.deliveryRuns.find((r) => r.driverId === d.id && r.status !== "DELIVERED")?.speedKmh ?? 0,
      heading: 0,
      recordedAt: new Date().toISOString(),
    }));
}

export function getDriverLocation(driverId: string): GpsLocation | undefined {
  const d = getDriver(driverId);
  if (!d) return undefined;
  const run = store.deliveryRuns.find((r) => r.driverId === driverId && r.status !== "DELIVERED");
  return {
    driverId,
    lat: d.currentLat,
    lng: d.currentLng,
    speedKmh: run?.speedKmh ?? 0,
    heading: 0,
    recordedAt: new Date().toISOString(),
  };
}

export function updateDriverLocation(driverId: string, lat: number, lng: number) {
  updateDriver(driverId, { currentLat: lat, currentLng: lng });
}

export function getActiveDeliveryRun(orderId: string): DeliveryRun | undefined {
  return store.deliveryRuns.find((r) => r.orderId === orderId && r.status !== "DELIVERED");
}
