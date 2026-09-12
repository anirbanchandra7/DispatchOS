"use server";

import { ensureSeeded } from "@/lib/store/ensure-seeded";
import { listOrders } from "@/lib/store/repositories/orders-repo";
import { listDrivers } from "@/lib/store/repositories/drivers-repo";
import { listVehicles } from "@/lib/store/repositories/vehicles-repo";
import { getOrderSla } from "@/lib/sla/sla-engine";
import { getRecentAudit } from "@/lib/audit/audit-log";
import type { Order } from "@/types";

const TREND_WINDOW_MS = 3 * 60 * 60 * 1000; // 3 hours

/** % change of `current` vs `previous`, comparing the last window to the one before it. */
function trend(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function countInWindow(orders: Order[], predicate: (o: Order) => boolean, msAgoStart: number, msAgoEnd: number): number {
  const now = Date.now();
  return orders.filter((o) => {
    const t = new Date(o.orderTime).getTime();
    const age = now - t;
    return age >= msAgoStart && age < msAgoEnd && predicate(o);
  }).length;
}

/** Computes a {value, deltaPct} pair by comparing the last 3h to the previous 3h. */
function withTrend(orders: Order[], predicate: (o: Order) => boolean) {
  const current = countInWindow(orders, predicate, 0, TREND_WINDOW_MS);
  const previous = countInWindow(orders, predicate, TREND_WINDOW_MS, TREND_WINDOW_MS * 2);
  return { value: orders.filter(predicate).length, deltaPct: trend(current, previous) };
}

export async function getDashboardData() {
  ensureSeeded();
  const orders = listOrders();
  const drivers = listDrivers();
  const vehicles = listVehicles();

  const cards = {
    todaysOrders: withTrend(orders, () => true),
    pendingFulfilment: withTrend(orders, (o) => ["RECEIVED", "ACCEPTED", "PICKING"].includes(o.status)),
    readyOrders: withTrend(orders, (o) => o.status === "READY"),
    activeDeliveries: withTrend(orders, (o) => o.status === "DISPATCHED" || o.status === "OUT_FOR_DELIVERY"),
    delivered: withTrend(orders, (o) => o.status === "DELIVERED"),
    cancelled: withTrend(orders, (o) => o.status === "CANCELLED" || o.status === "FAILED"),
    ordersAtRisk: withTrend(orders, (o) => !["DELIVERED", "CANCELLED", "FAILED"].includes(o.status) && getOrderSla(o).state !== "ON_TRACK"),
    onTimePct: (() => {
      const delivered = orders.filter((o) => o.status === "DELIVERED");
      if (delivered.length === 0) return { value: 100, deltaPct: 0 };
      const onTime = delivered.filter((o) => o.deliveredAt && new Date(o.deliveredAt) <= new Date(o.requestedDeliveryTime));
      return { value: Math.round((onTime.length / delivered.length) * 1000) / 10, deltaPct: 0 };
    })(),
  };

  const statusOrder = [
    "RECEIVED", "ACCEPTED", "PICKING", "READY", "DRIVER_ASSIGNED", "VEHICLE_ASSIGNED",
    "DISPATCHED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "FAILED",
  ] as const;
  const statusBreakdown = statusOrder.map((s) => ({ status: s, count: orders.filter((o) => o.status === s).length })).filter((s) => s.count > 0);

  // Orders by platform, bucketed by hour of day (for the stacked bar chart).
  const platformHourBuckets: Record<string, { uberEats: number; deliveroo: number }> = {};
  orders.forEach((o) => {
    const hour = new Date(o.orderTime).getHours();
    const label = `${hour % 12 === 0 ? 12 : hour % 12}${hour < 12 ? "am" : "pm"}`;
    if (!platformHourBuckets[label]) platformHourBuckets[label] = { uberEats: 0, deliveroo: 0 };
    if (o.source === "UBER_EATS") platformHourBuckets[label].uberEats += 1;
    else platformHourBuckets[label].deliveroo += 1;
  });
  const ordersByPlatform = Object.entries(platformHourBuckets)
    .map(([hour, v]) => ({ hour, ...v, sortKey: new Date(`2000-01-01 ${hour}`).getHours() }))
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ hour, uberEats, deliveroo }) => ({ hour, uberEats, deliveroo }));

  // Deliveries over time: completed (by deliveredAt hour) vs scheduled (by requestedDeliveryTime hour).
  const completedBuckets: Record<string, number> = {};
  const scheduledBuckets: Record<string, number> = {};
  orders.forEach((o) => {
    if (o.status === "DELIVERED" && o.deliveredAt) {
      const h = new Date(o.deliveredAt).getHours();
      const label = `${h.toString().padStart(2, "0")}:00`;
      completedBuckets[label] = (completedBuckets[label] || 0) + 1;
    }
    const rh = new Date(o.requestedDeliveryTime).getHours();
    const rLabel = `${rh.toString().padStart(2, "0")}:00`;
    scheduledBuckets[rLabel] = (scheduledBuckets[rLabel] || 0) + 1;
  });
  const allHours = Array.from(new Set([...Object.keys(completedBuckets), ...Object.keys(scheduledBuckets)])).sort();
  const deliveriesOverTime = allHours.map((hour) => ({
    hour,
    completed: completedBuckets[hour] || 0,
    scheduled: scheduledBuckets[hour] || 0,
  }));

  const driverUtilisation = [
    { name: "On Delivery", value: drivers.filter((d) => d.status === "BUSY").length },
    { name: "Available", value: drivers.filter((d) => d.status === "AVAILABLE").length },
    { name: "On Break", value: drivers.filter((d) => d.status === "ON_BREAK").length },
    { name: "Offline", value: drivers.filter((d) => d.status === "OFFLINE" || d.status === "INACTIVE").length },
  ];
  const driverActivePct = drivers.length > 0 ? Math.round(((driverUtilisation[0].value + driverUtilisation[1].value) / drivers.length) * 100) : 0;

  const vehicleUtilisation = [
    { name: "In Use", value: vehicles.filter((v) => v.status === "ASSIGNED" || v.status === "IN_TRANSIT").length },
    { name: "Available", value: vehicles.filter((v) => v.status === "AVAILABLE").length },
    { name: "Maintenance", value: vehicles.filter((v) => v.status === "MAINTENANCE").length },
    { name: "Inactive", value: vehicles.filter((v) => v.status === "INACTIVE").length },
  ];
  const vehicleInUsePct = vehicles.length > 0 ? Math.round((vehicleUtilisation[0].value / vehicles.length) * 100) : 0;

  const deliveredOrders = orders.filter((o) => o.status === "DELIVERED" && o.deliveredAt);
  const avgDeliveryMinutes =
    deliveredOrders.length > 0
      ? Math.round(deliveredOrders.reduce((s, o) => s + (new Date(o.deliveredAt!).getTime() - new Date(o.orderTime).getTime()) / 60000, 0) / deliveredOrders.length)
      : 0;
  const cancellationRate = orders.length > 0 ? Math.round((orders.filter((o) => o.status === "CANCELLED" || o.status === "FAILED").length / orders.length) * 1000) / 10 : 0;

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.orderTime).getTime() - new Date(a.orderTime).getTime())
    .slice(0, 6)
    .map((o) => ({
      id: o.id,
      externalOrderId: o.externalOrderId,
      source: o.source,
      customerName: o.customerName,
      itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
      orderValue: o.orderValue,
      status: o.status,
      etaMinutes: ["DELIVERED", "CANCELLED", "FAILED"].includes(o.status)
        ? null
        : Math.max(0, Math.round((new Date(o.requestedDeliveryTime).getTime() - Date.now()) / 60000)),
    }));

  const liveActivity = getRecentAudit(8);

  return {
    cards,
    statusBreakdown,
    ordersByPlatform,
    deliveriesOverTime,
    driverUtilisation,
    driverActivePct,
    vehicleUtilisation,
    vehicleInUsePct,
    deliveryPerformance: { avgDeliveryMinutes, onTimePct: cards.onTimePct.value, cancellationRate },
    recentOrders,
    liveActivity,
  };
}
