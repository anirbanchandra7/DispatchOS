"use server";

import { ensureSeeded } from "@/lib/store/ensure-seeded";
import { tickGpsEngine } from "@/lib/gps/mock-gps-engine";
import { listOrders } from "@/lib/store/repositories/orders-repo";
import { listDrivers, getOwnedVehicle } from "@/lib/store/repositories/drivers-repo";
import { listVehicles } from "@/lib/store/repositories/vehicles-repo";
import { store } from "@/lib/store/data-store";
import { getOrderSla } from "@/lib/sla/sla-engine";
import { estimateEtaMinutes } from "@/lib/dispatch/allocation-engine";
import { routeLengthKm } from "@/lib/geo";
import type { DeliveryRun, Driver, DriverStatus } from "@/types";

export interface DriverMarker {
  id: string;
  fullName: string;
  avatarUrl: string;
  lat: number;
  lng: number;
  status: DriverStatus;
  markerColor: "green" | "blue" | "orange" | "red" | "grey";
  vehicleLabel?: string;
  currentOrderId?: string;
  currentOrderExternalId?: string;
  speedKmh: number;
  lastGpsUpdate: string;
  etaMinutes?: number;
  legLabel?: string;
  todayDeliveries: number;
}

function markerColorFor(driver: Driver, atRisk: boolean): DriverMarker["markerColor"] {
  if (driver.status === "OFFLINE" || driver.status === "INACTIVE") return "grey";
  if (driver.status === "ON_BREAK") return "orange";
  if (atRisk) return "red";
  if (driver.status === "BUSY") return "blue";
  return "green";
}

/** Minutes remaining on the run's current leg, based on actual remaining route length. */
function legEtaMinutes(run: DeliveryRun | undefined): number | undefined {
  if (!run || run.status === "DELIVERED") return undefined;
  if (run.status === "AT_PICKUP" || run.status === "ARRIVED_AT_CUSTOMER") return 0;
  const totalKm = routeLengthKm(run.routePoints);
  const remainingKm = totalKm * (1 - run.progress);
  const speed = run.speedKmh || 25;
  return Math.max(1, Math.round((remainingKm / speed) * 60));
}

function legLabel(order: { status: string } | undefined, run: DeliveryRun | undefined): string | undefined {
  if (!order || !run) return undefined;
  switch (run.status) {
    case "EN_ROUTE_PICKUP":
      return "Heading to pickup";
    case "AT_PICKUP":
      return "At pickup";
    case "EN_ROUTE_CUSTOMER":
      return "Heading to customer";
    case "ARRIVED_AT_CUSTOMER":
      return "At customer";
    default:
      return undefined;
  }
}

export async function getControlTowerSnapshot() {
  ensureSeeded();
  tickGpsEngine();

  const orders = listOrders();
  const drivers = listDrivers();
  const vehicles = listVehicles();

  const activeOrders = orders.filter((o) => !["DELIVERED", "CANCELLED", "FAILED"].includes(o.status));
  const atRiskOrders = activeOrders.filter((o) => getOrderSla(o).state !== "ON_TRACK");
  const deliveredToday = orders.filter((o) => o.status === "DELIVERED");
  const onTimeDelivered = deliveredToday.filter((o) => o.deliveredAt && new Date(o.deliveredAt) <= new Date(o.requestedDeliveryTime));
  const onTimePct = deliveredToday.length > 0 ? Math.round((onTimeDelivered.length / deliveredToday.length) * 1000) / 10 : 100;

  const avgDeliveryMinutes =
    deliveredToday.length > 0
      ? Math.round(
          deliveredToday.reduce((sum, o) => {
            if (!o.deliveredAt) return sum;
            return sum + (new Date(o.deliveredAt).getTime() - new Date(o.orderTime).getTime()) / 60000;
          }, 0) / deliveredToday.length,
        )
      : 0;

  const kpis = {
    activeOrders: activeOrders.length,
    driversAvailable: drivers.filter((d) => d.status === "AVAILABLE").length,
    driversOnDelivery: drivers.filter((d) => d.status === "BUSY").length,
    vehiclesAvailable: vehicles.filter((v) => v.status === "AVAILABLE").length + store.driverOwnedVehicles.filter((v) => v.status === "AVAILABLE").length,
    ordersAtRisk: atRiskOrders.length,
    avgDeliveryMinutes,
    onTimePct,
    ordersWaitingForDriver: orders.filter((o) => o.status === "READY").length,
  };

  const markers: DriverMarker[] = drivers
    .filter((d) => d.status !== "INACTIVE")
    .map((d) => {
      const order = d.currentOrderId ? orders.find((o) => o.id === d.currentOrderId) : undefined;
      const atRisk = order ? getOrderSla(order).state !== "ON_TRACK" : false;
      const run = store.deliveryRuns.find((r) => r.driverId === d.id && r.status !== "DELIVERED");
      const vehicleLabel = d.hasOwnVehicle && d.ownVehicleId ? (() => {
        const v = getOwnedVehicle(d.ownVehicleId!);
        return v ? `${v.make} ${v.model} (${v.registrationNumber})` : undefined;
      })() : order?.vehicleId ? vehicles.find((v) => v.id === order.vehicleId)?.registrationNumber : undefined;

      return {
        id: d.id,
        fullName: d.fullName,
        avatarUrl: d.avatarUrl,
        lat: d.currentLat,
        lng: d.currentLng,
        status: d.status,
        markerColor: markerColorFor(d, atRisk),
        vehicleLabel,
        currentOrderId: order?.id,
        currentOrderExternalId: order?.externalOrderId,
        speedKmh: Math.round(run?.speedKmh ?? 0),
        lastGpsUpdate: run?.lastGpsUpdate ?? d.updatedAt,
        etaMinutes: legEtaMinutes(run),
        legLabel: legLabel(order, run),
        todayDeliveries: d.deliveryCount,
      };
    });

  const atRiskPanel = atRiskOrders.slice(0, 8).map((o) => ({
    id: o.id,
    externalOrderId: o.externalOrderId,
    source: o.source,
    reason: !o.driverId ? "No driver assigned" : getOrderSla(o).state === "BREACHED" ? "SLA breached" : "Running late",
  }));

  const availableDriversPanel = drivers
    .filter((d) => d.status === "AVAILABLE")
    .slice(0, 8)
    .map((d) => ({ id: d.id, fullName: d.fullName, locationLabel: d.currentLocationLabel }));

  const activeDeliveriesPanel = activeOrders
    .filter((o) => o.status === "DISPATCHED" || o.status === "OUT_FOR_DELIVERY")
    .slice(0, 8)
    .map((o) => {
      const marker = markers.find((m) => m.currentOrderId === o.id);
      return {
        id: o.id,
        externalOrderId: o.externalOrderId,
        customerName: o.customerName,
        etaMinutes: marker?.etaMinutes ?? estimateEtaMinutes(o),
        legLabel: marker?.legLabel,
      };
    });

  return { kpis, markers, atRiskPanel, availableDriversPanel, activeDeliveriesPanel };
}

export type ControlTowerSnapshot = Awaited<ReturnType<typeof getControlTowerSnapshot>>;
