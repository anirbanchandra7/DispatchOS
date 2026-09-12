"use server";

import { ensureSeeded } from "@/lib/store/ensure-seeded";
import { listOrders } from "@/lib/store/repositories/orders-repo";
import { listDrivers } from "@/lib/store/repositories/drivers-repo";
import { listVehicles } from "@/lib/store/repositories/vehicles-repo";
import type { Order } from "@/types";

export type ReportRange = "today" | "yesterday" | "7d" | "30d" | "custom";

export interface ReportFilters {
  range: ReportRange;
  from?: string;
  to?: string;
}

function withinRange(order: Order, filters: ReportFilters): boolean {
  const t = new Date(order.orderTime).getTime();
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  switch (filters.range) {
    case "today":
      return t >= startOfDay(now);
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return t >= startOfDay(y) && t < startOfDay(now);
    }
    case "7d":
      return t >= now.getTime() - 7 * 86_400_000;
    case "30d":
      return t >= now.getTime() - 30 * 86_400_000;
    case "custom":
      if (!filters.from || !filters.to) return true;
      return t >= new Date(filters.from).getTime() && t <= new Date(filters.to).getTime();
    default:
      return true;
  }
}

export async function getReportsData(filters: ReportFilters) {
  ensureSeeded();
  const orders = listOrders().filter((o) => withinRange(o, filters));
  const drivers = listDrivers();
  const vehicles = listVehicles();

  const delivered = orders.filter((o) => o.status === "DELIVERED");
  const cancelled = orders.filter((o) => o.status === "CANCELLED" || o.status === "FAILED");

  const revenue = delivered.reduce((s, o) => s + o.orderValue, 0);
  const avgDeliveryMinutes =
    delivered.length > 0
      ? Math.round(delivered.reduce((s, o) => s + (new Date(o.deliveredAt!).getTime() - new Date(o.orderTime).getTime()) / 60000, 0) / delivered.length)
      : 0;
  const avgFulfilmentMinutes =
    orders.filter((o) => o.readyAt).length > 0
      ? Math.round(
          orders
            .filter((o) => o.readyAt)
            .reduce((s, o) => s + (new Date(o.readyAt!).getTime() - new Date(o.orderTime).getTime()) / 60000, 0) /
            orders.filter((o) => o.readyAt).length,
        )
      : 0;
  const avgDispatchMinutes =
    orders.filter((o) => o.dispatchedAt && o.readyAt).length > 0
      ? Math.round(
          orders
            .filter((o) => o.dispatchedAt && o.readyAt)
            .reduce((s, o) => s + (new Date(o.dispatchedAt!).getTime() - new Date(o.readyAt!).getTime()) / 60000, 0) /
            orders.filter((o) => o.dispatchedAt && o.readyAt).length,
        )
      : 0;

  const onTime = delivered.filter((o) => o.deliveredAt && new Date(o.deliveredAt) <= new Date(o.requestedDeliveryTime));
  const onTimePct = delivered.length > 0 ? Math.round((onTime.length / delivered.length) * 1000) / 10 : 100;
  const cancellationRate = orders.length > 0 ? Math.round((cancelled.length / orders.length) * 1000) / 10 : 0;

  const platformSplit = [
    { name: "Uber Eats", value: orders.filter((o) => o.source === "UBER_EATS").length },
    { name: "Deliveroo", value: orders.filter((o) => o.source === "DELIVEROO").length },
  ];

  const ordersPerDriver = drivers
    .map((d) => ({ name: d.fullName, count: orders.filter((o) => o.driverId === d.id).length }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count);

  const ordersPerVehicle = vehicles
    .map((v) => ({ name: v.registrationNumber, count: orders.filter((o) => o.vehicleId === v.id).length }))
    .filter((v) => v.count > 0)
    .sort((a, b) => b.count - a.count);

  const driverUtilisationPct = drivers.length > 0 ? Math.round((drivers.filter((d) => d.status === "BUSY").length / drivers.length) * 1000) / 10 : 0;
  const vehicleUtilisationPct =
    vehicles.length > 0 ? Math.round((vehicles.filter((v) => v.status !== "AVAILABLE" && v.status !== "INACTIVE").length / vehicles.length) * 1000) / 10 : 0;

  return {
    orderVolume: orders.length,
    revenue: Math.round(revenue * 100) / 100,
    avgDeliveryMinutes,
    avgFulfilmentMinutes,
    avgDispatchMinutes,
    onTimePct,
    cancellationRate,
    driverUtilisationPct,
    vehicleUtilisationPct,
    platformSplit,
    ordersPerDriver,
    ordersPerVehicle,
  };
}
