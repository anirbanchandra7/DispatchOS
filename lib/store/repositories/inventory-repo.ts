import { store } from "@/lib/store/data-store";
import { newId } from "@/lib/id";
import type { InventoryItem, InventoryTransactionType } from "@/types";

export function listInventory(): InventoryItem[] {
  return store.inventory;
}

export function getInventoryBySku(sku: string): InventoryItem | undefined {
  return store.inventory.find((i) => i.sku === sku);
}

export function skuExists(sku: string): boolean {
  return store.inventory.some((i) => i.sku.toLowerCase() === sku.toLowerCase());
}

export function createInventoryItem(item: Omit<InventoryItem, "id" | "updatedAt">): InventoryItem {
  const full: InventoryItem = { ...item, id: newId(), updatedAt: new Date().toISOString() };
  store.inventory.push(full);
  return full;
}

export function updateInventoryItem(
  sku: string,
  patch: Partial<Pick<InventoryItem, "productName" | "category" | "unit" | "location" | "reorderThreshold">>,
): InventoryItem | undefined {
  const item = getInventoryBySku(sku);
  if (!item) return undefined;
  Object.assign(item, patch, { updatedAt: new Date().toISOString() });
  return item;
}

/**
 * Adjusts quantityOnHand by `delta` (positive to restock, negative to
 * correct a count down) and logs the matching transaction. Returns the
 * updated item, or undefined if the SKU doesn't exist.
 */
export function adjustStock(
  sku: string,
  delta: number,
  type: InventoryTransactionType,
  note?: string,
  orderId?: string,
): InventoryItem | undefined {
  const item = getInventoryBySku(sku);
  if (!item) return undefined;
  item.quantityOnHand = Math.max(0, item.quantityOnHand + delta);
  item.updatedAt = new Date().toISOString();
  // RESTOCK is always an increase (validated at the action layer) so it's
  // recorded as a plain positive count; ADJUSTMENT keeps its sign so the
  // ledger shows whether stock went up or down.
  recordTransaction(sku, type, type === "ADJUSTMENT" ? delta : Math.abs(delta), orderId, note);
  return item;
}

export function availableQuantity(item: InventoryItem): number {
  return item.quantityOnHand - item.reservedQuantity;
}

export function recordTransaction(
  sku: string,
  type: InventoryTransactionType,
  quantity: number,
  orderId?: string,
  note?: string,
) {
  store.inventoryTransactions.unshift({
    id: newId(),
    sku,
    type,
    quantity,
    orderId,
    note,
    createdAt: new Date().toISOString(),
  });
}

export function listTransactions(sku?: string) {
  return sku ? store.inventoryTransactions.filter((t) => t.sku === sku) : store.inventoryTransactions;
}
