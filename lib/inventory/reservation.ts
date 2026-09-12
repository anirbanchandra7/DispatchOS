import { getInventoryBySku, availableQuantity, recordTransaction } from "@/lib/store/repositories/inventory-repo";
import { notify } from "@/lib/notifications/notification-service";
import type { Order } from "@/types";

export interface StockShortage {
  sku: string;
  productName: string;
  requested: number;
  available: number;
}

export interface ReservationResult {
  ok: boolean;
  shortages: StockShortage[];
}

/**
 * Pure read-only check: does every line item on this order have enough
 * unreserved stock? Used both by reserveInventoryForOrder (which then
 * commits the reservation) and by the auto-accept engine / Fulfilment
 * board to preview shortages before anything is written.
 */
export function checkStockForOrder(order: Order): StockShortage[] {
  const shortages: StockShortage[] = [];
  for (const item of order.items) {
    const inv = getInventoryBySku(item.sku);
    if (!inv) continue;
    const avail = availableQuantity(inv);
    if (avail < item.quantity) {
      shortages.push({ sku: item.sku, productName: item.productName, requested: item.quantity, available: avail });
    }
  }
  return shortages;
}

/** Reserve stock for every line item on an order (called on Accept/Pick). */
export function reserveInventoryForOrder(order: Order): ReservationResult {
  const shortages = checkStockForOrder(order);
  if (shortages.length > 0) {
    return { ok: false, shortages };
  }

  for (const item of order.items) {
    const inv = getInventoryBySku(item.sku);
    if (!inv) continue;
    inv.reservedQuantity += item.quantity;
    inv.updatedAt = new Date().toISOString();
    recordTransaction(item.sku, "RESERVE", item.quantity, order.id, `Reserved for order ${order.externalOrderId}`);
    checkLowStock(inv.sku);
  }
  return { ok: true, shortages: [] };
}

/**
 * Reserve stock for an order regardless of shortages ("Accept Anyway" from
 * the Fulfilment board) - reservedQuantity may exceed quantityOnHand,
 * effectively backordering the short items. Every line is still logged.
 */
export function forceReserveInventoryForOrder(order: Order): void {
  for (const item of order.items) {
    const inv = getInventoryBySku(item.sku);
    if (!inv) continue;
    inv.reservedQuantity += item.quantity;
    inv.updatedAt = new Date().toISOString();
    recordTransaction(item.sku, "RESERVE", item.quantity, order.id, `Reserved (override - accepted despite shortage) for order ${order.externalOrderId}`);
    checkLowStock(inv.sku);
  }
}

/** Release reserved stock without deducting (e.g. order cancelled before pick). */
export function releaseInventoryForOrder(order: Order) {
  for (const item of order.items) {
    const inv = getInventoryBySku(item.sku);
    if (!inv) continue;
    inv.reservedQuantity = Math.max(0, inv.reservedQuantity - item.quantity);
    inv.updatedAt = new Date().toISOString();
    recordTransaction(item.sku, "RELEASE", item.quantity, order.id, `Released for cancelled order ${order.externalOrderId}`);
  }
}

/** Deduct stock permanently once an order is dispatched/delivered. */
export function deductInventoryForOrder(order: Order) {
  for (const item of order.items) {
    const inv = getInventoryBySku(item.sku);
    if (!inv) continue;
    inv.quantityOnHand = Math.max(0, inv.quantityOnHand - item.quantity);
    inv.reservedQuantity = Math.max(0, inv.reservedQuantity - item.quantity);
    inv.updatedAt = new Date().toISOString();
    recordTransaction(item.sku, "DEDUCT", item.quantity, order.id, `Deducted for dispatched order ${order.externalOrderId}`);
  }
}

function checkLowStock(sku: string) {
  const inv = getInventoryBySku(sku);
  if (!inv) return;
  const avail = availableQuantity(inv);
  if (avail <= 0) {
    notify("LOW_STOCK", "Out of stock", `${inv.productName} (${inv.sku}) is now out of stock.`);
  } else if (avail <= inv.reorderThreshold) {
    notify("LOW_STOCK", "Low stock alert", `${inv.productName} (${inv.sku}) is below reorder threshold (${avail} left).`);
  }
}

export function stockState(item: { quantityOnHand: number; reservedQuantity: number; reorderThreshold: number }): "AVAILABLE" | "LOW_STOCK" | "OUT_OF_STOCK" {
  const avail = item.quantityOnHand - item.reservedQuantity;
  if (avail <= 0) return "OUT_OF_STOCK";
  if (avail <= item.reorderThreshold) return "LOW_STOCK";
  return "AVAILABLE";
}
