"use server";

import { ensureSeeded } from "@/lib/store/ensure-seeded";
import { getDriver } from "@/lib/store/repositories/drivers-repo";
import { getOrder } from "@/lib/store/repositories/orders-repo";
import { tickGpsEngine, getActiveDeliveryRun } from "@/lib/gps/mock-gps-engine";
import { markCollected, markDelivered, markFailed } from "@/lib/dispatch/driver-actions";
import { getOrderSla } from "@/lib/sla/sla-engine";
import { store } from "@/lib/store/data-store";

export async function getDriverPortal(driverId: string) {
  ensureSeeded();
  tickGpsEngine();

  const driver = getDriver(driverId);
  if (!driver) return null;

  const activeOrder = driver.currentOrderId ? getOrder(driver.currentOrderId) : undefined;
  const run = activeOrder ? getActiveDeliveryRun(activeOrder.id) : undefined;

  const history = store.orders
    .filter((o) => o.driverId === driverId && ["DELIVERED", "CANCELLED", "FAILED"].includes(o.status))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 10);

  return {
    driver,
    activeOrder: activeOrder ?? null,
    run: run ?? null,
    sla: activeOrder ? getOrderSla(activeOrder) : null,
    history,
  };
}

export async function markCollectedAction(orderId: string, driverId: string, actor: string) {
  ensureSeeded();
  return markCollected(orderId, driverId, actor);
}

export async function markDeliveredAction(orderId: string, driverId: string, actor: string) {
  ensureSeeded();
  return markDelivered(orderId, driverId, actor);
}

export async function markFailedAction(orderId: string, driverId: string, actor: string, reason: string) {
  ensureSeeded();
  return markFailed(orderId, driverId, actor, reason);
}
