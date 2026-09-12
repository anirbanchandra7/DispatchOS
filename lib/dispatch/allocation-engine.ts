import { listDrivers, getDriver, updateDriver, getOwnedVehicle, updateOwnedVehicle } from "@/lib/store/repositories/drivers-repo";
import { listVehicles, getVehicle, updateVehicle } from "@/lib/store/repositories/vehicles-repo";
import { getOrder, updateOrder } from "@/lib/store/repositories/orders-repo";
import { haversineKm } from "@/lib/geo";
import { recordAudit } from "@/lib/audit/audit-log";
import { notify } from "@/lib/notifications/notification-service";
import { buildRoute } from "@/lib/gps/routes";
import { newId } from "@/lib/id";
import { store } from "@/lib/store/data-store";
import type { Driver, DriverOption, Order, VehicleOption, VehicleOwnership } from "@/types";

export const OPERATIONAL_RADIUS_KM = 25;

// ---------- Driver allocation ----------

export function getAvailableDrivers(order: Order): DriverOption[] {
  const pickup = { lat: order.pickupLat, lng: order.pickupLng };

  const eligible = listDrivers().filter((d) => {
    if (d.status !== "AVAILABLE") return false;
    if (new Date(d.licenceExpiry).getTime() < Date.now()) return false;
    if (d.currentOrderId) return false;
    const distance = haversineKm(pickup, { lat: d.currentLat, lng: d.currentLng });
    return distance <= OPERATIONAL_RADIUS_KM;
  });

  const scored = eligible
    .map((d) => ({
      driver: d,
      distanceKm: haversineKm(pickup, { lat: d.currentLat, lng: d.currentLng }),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return scored.map(({ driver, distanceKm }, idx) => ({
    id: driver.id,
    fullName: driver.fullName,
    avatarUrl: driver.avatarUrl,
    distanceKm: Math.round(distanceKm * 10) / 10,
    status: driver.status,
    currentVehicleLabel: vehicleLabelForDriver(driver),
    activeDeliveries: driver.currentOrderId ? 1 : 0,
    deliveryCount: driver.deliveryCount,
    onShift: driver.onShift,
    recommended: idx === 0,
  }));
}

export function recommendDriver(order: Order): DriverOption | undefined {
  return getAvailableDrivers(order)[0];
}

function vehicleLabelForDriver(driver: Driver): string | undefined {
  if (driver.hasOwnVehicle && driver.ownVehicleId) {
    const v = getOwnedVehicle(driver.ownVehicleId);
    return v ? `${v.make} ${v.model}` : undefined;
  }
  return undefined;
}

export function validateDriverAssignment(orderId: string, driverId: string): { ok: boolean; error?: string } {
  const order = getOrder(orderId);
  const driver = getDriver(driverId);
  if (!order) return { ok: false, error: "Order not found" };
  if (!driver) return { ok: false, error: "Driver not found" };
  if (driver.status !== "AVAILABLE") return { ok: false, error: `${driver.fullName} is not available` };
  if (driver.currentOrderId) return { ok: false, error: `${driver.fullName} is already assigned to an active order` };
  if (new Date(driver.licenceExpiry).getTime() < Date.now()) return { ok: false, error: `${driver.fullName}'s licence has expired` };
  const distance = haversineKm({ lat: order.pickupLat, lng: order.pickupLng }, { lat: driver.currentLat, lng: driver.currentLng });
  if (distance > OPERATIONAL_RADIUS_KM) return { ok: false, error: `${driver.fullName} is outside the operational radius` };
  return { ok: true };
}

export function assignDriver(orderId: string, driverId: string, actor: string): { ok: boolean; error?: string } {
  const validation = validateDriverAssignment(orderId, driverId);
  if (!validation.ok) return validation;

  const order = getOrder(orderId)!;
  const driver = getDriver(driverId)!;

  updateDriver(driverId, { currentOrderId: orderId });
  updateOrder(orderId, { status: "DRIVER_ASSIGNED", driverId }, actor);
  recordAudit({ entityType: "ORDER", entityId: orderId, action: `Driver ${driver.fullName} assigned`, actor });
  notify("DRIVER_ASSIGNED", "Driver assigned", `Driver ${driver.fullName} has been assigned to order ${order.externalOrderId}.`, { orderId, driverId });
  return { ok: true };
}

// ---------- Vehicle allocation ----------

export function getAvailableVehicles(order: Order): VehicleOption[] {
  const driver = order.driverId ? getDriver(order.driverId) : undefined;
  const options: VehicleOption[] = [];

  if (driver?.hasOwnVehicle && driver.ownVehicleId) {
    const ov = getOwnedVehicle(driver.ownVehicleId);
    if (ov && ov.status === "AVAILABLE" && documentsValid(ov.insuranceExpiry) && documentsValid(ov.registrationExpiry)) {
      options.push({
        id: ov.id,
        ownership: "DRIVER_OWNED",
        registrationNumber: ov.registrationNumber,
        make: ov.make,
        model: ov.model,
        vehicleType: ov.vehicleType,
        capacityKg: ov.capacityKg,
        available: true,
        recommended: true,
        driverId: driver.id,
        statusLabel: "Available",
      });
    }
  }

  const companyOptions = listVehicles()
    .filter((v) => v.status === "AVAILABLE" && !v.currentDriverId)
    .filter((v) => documentsValid(v.insuranceExpiry) && documentsValid(v.registrationExpiry) && documentsValid(v.inspectionExpiry))
    .map((v) => ({
      id: v.id,
      ownership: "COMPANY" as VehicleOwnership,
      registrationNumber: v.registrationNumber,
      make: v.make,
      model: v.model,
      vehicleType: v.vehicleType,
      capacityKg: v.capacityKg,
      available: true,
      recommended: false,
      statusLabel: "Available",
    }));

  return [...options, ...companyOptions];
}

function documentsValid(expiry: string): boolean {
  return new Date(expiry).getTime() > Date.now();
}

export function recommendVehicle(order: Order): VehicleOption | undefined {
  const options = getAvailableVehicles(order);
  return options.find((o) => o.recommended) ?? options[0];
}

export function validateVehicleAssignment(
  orderId: string,
  vehicleId: string,
  ownership: VehicleOwnership,
): { ok: boolean; error?: string } {
  const order = getOrder(orderId);
  if (!order) return { ok: false, error: "Order not found" };

  if (ownership === "DRIVER_OWNED") {
    const v = getOwnedVehicle(vehicleId);
    if (!v) return { ok: false, error: "Vehicle not found" };
    if (v.status !== "AVAILABLE") return { ok: false, error: "Vehicle is not available" };
    if (!documentsValid(v.insuranceExpiry)) return { ok: false, error: "Vehicle insurance has expired" };
    if (!documentsValid(v.registrationExpiry)) return { ok: false, error: "Vehicle registration has expired" };
    if (order.driverId !== v.driverId) return { ok: false, error: "Vehicle does not belong to the assigned driver" };
  } else {
    const v = getVehicle(vehicleId);
    if (!v) return { ok: false, error: "Vehicle not found" };
    if (v.status !== "AVAILABLE" || v.currentDriverId) return { ok: false, error: "Vehicle is not available" };
    if (!documentsValid(v.insuranceExpiry)) return { ok: false, error: "Vehicle insurance has expired" };
    if (!documentsValid(v.registrationExpiry)) return { ok: false, error: "Vehicle registration has expired" };
    if (!documentsValid(v.inspectionExpiry)) return { ok: false, error: "Vehicle inspection has expired" };
  }
  return { ok: true };
}

export function assignVehicle(
  orderId: string,
  vehicleId: string,
  ownership: VehicleOwnership,
  actor: string,
): { ok: boolean; error?: string } {
  const validation = validateVehicleAssignment(orderId, vehicleId, ownership);
  if (!validation.ok) return validation;

  const order = getOrder(orderId)!;
  let label = "";

  if (ownership === "DRIVER_OWNED") {
    const v = updateOwnedVehicle(vehicleId, { status: "ASSIGNED" })!;
    label = `${v.make} ${v.model} (${v.registrationNumber})`;
  } else {
    const v = updateVehicle(vehicleId, { status: "ASSIGNED", currentDriverId: order.driverId })!;
    label = `${v.make} ${v.model} (${v.registrationNumber})`;
  }

  updateOrder(orderId, { status: "VEHICLE_ASSIGNED", vehicleId, vehicleOwnership: ownership }, actor);
  recordAudit({ entityType: "ORDER", entityId: orderId, action: `Vehicle ${label} assigned`, actor });
  notify("VEHICLE_ASSIGNED", "Vehicle assigned", `Vehicle ${label} is now assigned to order ${order.externalOrderId}.`, { orderId, vehicleId });
  return { ok: true };
}

// ---------- Dispatch ----------

export function estimateEtaMinutes(order: Order): number {
  const distance = haversineKm({ lat: order.pickupLat, lng: order.pickupLng }, { lat: order.deliveryLat, lng: order.deliveryLng });
  const avgSpeedKmh = 32;
  return Math.max(5, Math.round((distance / avgSpeedKmh) * 60));
}

export function dispatchOrder(orderId: string, actor: string): { ok: boolean; error?: string } {
  const order = getOrder(orderId);
  if (!order) return { ok: false, error: "Order not found" };
  if (order.status !== "VEHICLE_ASSIGNED") return { ok: false, error: "Order must have driver and vehicle assigned first" };
  if (!order.driverId || !order.vehicleId || !order.vehicleOwnership) return { ok: false, error: "Incomplete assignment" };

  const driver = getDriver(order.driverId);
  if (!driver) return { ok: false, error: "Driver not found" };

  const etaMinutes = estimateEtaMinutes(order);
  const now = new Date().toISOString();

  updateOrder(orderId, { status: "DISPATCHED", dispatchedAt: now }, actor);
  updateDriver(order.driverId, { status: "BUSY" });
  if (order.vehicleOwnership === "DRIVER_OWNED") {
    updateOwnedVehicle(order.vehicleId, { status: "ASSIGNED" });
  } else {
    updateVehicle(order.vehicleId, { status: "ASSIGNED" });
  }

  // First leg: driver's current live position -> pickup. The second leg
  // (pickup -> customer) is built by markCollected() once the driver
  // actually has the order in hand.
  const route = buildRoute({ lat: driver.currentLat, lng: driver.currentLng }, { lat: order.pickupLat, lng: order.pickupLng }, 1);
  store.deliveryRuns.push({
    id: newId(),
    orderId,
    driverId: order.driverId,
    routePoints: route,
    progress: 0,
    startedAt: now,
    status: "EN_ROUTE_PICKUP",
    speedKmh: 30,
    lastGpsUpdate: now,
  });

  recordAudit({ entityType: "ORDER", entityId: orderId, action: "Order dispatched", actor });
  notify("ORDER_DISPATCHED", "Order dispatched", `Order ${order.externalOrderId} is dispatched to ${driver.fullName} (ETA to pickup shortly, ~${etaMinutes} min total trip).`, {
    orderId,
    driverId: order.driverId,
    vehicleId: order.vehicleId,
  });
  return { ok: true };
}
