import { store } from "@/lib/store/data-store";
import { newId } from "@/lib/id";
import type { Order, OrderStatus } from "@/types";

export function listOrders(): Order[] {
  return store.orders;
}

export function getOrder(id: string): Order | undefined {
  return store.orders.find((o) => o.id === id);
}

export function updateOrder(id: string, patch: Partial<Order>, changedBy = "System"): Order | undefined {
  const order = getOrder(id);
  if (!order) return undefined;
  Object.assign(order, patch, { updatedAt: new Date().toISOString() });
  if (patch.status && patch.status !== order.status) {
    recordStatusChange(order.id, patch.status, changedBy);
  }
  return order;
}

export function recordStatusChange(orderId: string, status: OrderStatus, changedBy: string, note?: string) {
  store.orderStatusHistory.push({
    id: newId(),
    orderId,
    status,
    changedAt: new Date().toISOString(),
    changedBy,
    note,
  });
}

export function getStatusHistory(orderId: string) {
  return store.orderStatusHistory
    .filter((h) => h.orderId === orderId)
    .sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());
}

export function addOrder(order: Order) {
  store.orders.unshift(order);
  recordStatusChange(order.id, order.status, `${order.source === "UBER_EATS" ? "Uber Eats" : "Deliveroo"} Integration`, "Order received from platform");
  return order;
}
