"use server";

import { ensureSeeded } from "@/lib/store/ensure-seeded";
import { listOrders } from "@/lib/store/repositories/orders-repo";
import { checkStockForOrder, type StockShortage } from "@/lib/inventory/reservation";
import type { Order } from "@/types";

export interface FulfilmentCard {
  order: Order;
  shortages: StockShortage[];
}

const ACTIONABLE_STATUSES: Order["status"][] = [
  "RECEIVED",
  "ACCEPTED",
  "PICKING",
  "READY",
  "DRIVER_ASSIGNED",
  "VEHICLE_ASSIGNED",
];

export async function getFulfilmentBoard(): Promise<FulfilmentCard[]> {
  ensureSeeded();
  return listOrders()
    .filter((o) => ACTIONABLE_STATUSES.includes(o.status))
    .map((order) => ({
      order,
      // Only RECEIVED orders can still be held for stock - once accepted,
      // stock is already reserved so a live shortage check is meaningless.
      shortages: order.status === "RECEIVED" ? checkStockForOrder(order) : [],
    }))
    .sort((a, b) => new Date(a.order.orderTime).getTime() - new Date(b.order.orderTime).getTime());
}
