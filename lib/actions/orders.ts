"use server";

import { ensureSeeded } from "@/lib/store/ensure-seeded";
import { listOrders, getOrder, getStatusHistory } from "@/lib/store/repositories/orders-repo";
import { getDriver, getOwnedVehicle } from "@/lib/store/repositories/drivers-repo";
import { getVehicle } from "@/lib/store/repositories/vehicles-repo";
import { getAuditForEntity } from "@/lib/audit/audit-log";
import { getActiveDeliveryRun } from "@/lib/gps/mock-gps-engine";
import {
  acceptOrder,
  rejectOrder,
  startFulfilment,
  markOrderReady,
} from "@/lib/dispatch/order-actions";
import { markCollected, markDelivered } from "@/lib/dispatch/driver-actions";
import {
  getAvailableDrivers,
  getAvailableVehicles,
  recommendDriver,
  recommendVehicle,
  assignDriver,
  assignVehicle,
  dispatchOrder,
  estimateEtaMinutes,
} from "@/lib/dispatch/allocation-engine";
import type { Order, VehicleOwnership } from "@/types";

export async function getOrders(): Promise<Order[]> {
  ensureSeeded();
  return listOrders();
}

export async function getOrderById(id: string) {
  ensureSeeded();
  const order = getOrder(id);
  if (!order) return null;
  const driver = order.driverId ? getDriver(order.driverId) : undefined;
  const vehicle = order.vehicleId
    ? order.vehicleOwnership === "DRIVER_OWNED"
      ? getOwnedVehicle(order.vehicleId)
      : getVehicle(order.vehicleId)
    : undefined;
  const history = getStatusHistory(id);
  const audit = getAuditForEntity("ORDER", id);
  const run = getActiveDeliveryRun(id) ?? null;
  return { order, driver, vehicle, history, audit, run };
}

export async function acceptOrderAction(orderId: string, actor: string, force = false) {
  ensureSeeded();
  return acceptOrder(orderId, actor, force);
}

export async function rejectOrderAction(orderId: string, actor: string, reason: string) {
  ensureSeeded();
  return rejectOrder(orderId, actor, reason);
}

export async function startFulfilmentAction(orderId: string, actor: string) {
  ensureSeeded();
  return startFulfilment(orderId, actor);
}

export async function markReadyAction(orderId: string, actor: string) {
  ensureSeeded();
  return markOrderReady(orderId, actor);
}

export async function getAllocationOptions(orderId: string) {
  ensureSeeded();
  const order = getOrder(orderId);
  if (!order) return null;
  return {
    drivers: getAvailableDrivers(order),
    vehicles: getAvailableVehicles(order),
    recommendedDriver: recommendDriver(order),
    recommendedVehicle: recommendVehicle(order),
    etaMinutes: estimateEtaMinutes(order),
  };
}

export async function assignDriverAction(orderId: string, driverId: string, actor: string) {
  ensureSeeded();
  return assignDriver(orderId, driverId, actor);
}

export async function assignVehicleAction(orderId: string, vehicleId: string, ownership: VehicleOwnership, actor: string) {
  ensureSeeded();
  return assignVehicle(orderId, vehicleId, ownership, actor);
}

export async function dispatchOrderAction(orderId: string, actor: string) {
  ensureSeeded();
  return dispatchOrder(orderId, actor);
}

/** Dispatcher override for a stuck order — force-collect without the driver having tapped it. */
export async function forceCollectAction(orderId: string, actor: string) {
  ensureSeeded();
  return markCollected(orderId, undefined, actor, true);
}

/** Dispatcher override for a stuck order — force-deliver without the driver having tapped it. */
export async function forceDeliverAction(orderId: string, actor: string) {
  ensureSeeded();
  return markDelivered(orderId, undefined, actor, true);
}
