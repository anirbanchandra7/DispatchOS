"use server";

import { ensureSeeded } from "@/lib/store/ensure-seeded";
import {
  listInventory,
  listTransactions,
  skuExists,
  createInventoryItem,
  updateInventoryItem,
  adjustStock,
  getInventoryBySku,
} from "@/lib/store/repositories/inventory-repo";
import { canManageInventory } from "@/lib/auth/permissions";
import { recordAudit } from "@/lib/audit/audit-log";
import { notify } from "@/lib/notifications/notification-service";
import { stockState } from "@/lib/inventory/reservation";
import type { UserRole } from "@/types";

export type InventoryActionResult = { ok: true } | { ok: false; error: string };

export async function getInventory() {
  ensureSeeded();
  return listInventory();
}

export async function getInventoryTransactions(sku?: string) {
  ensureSeeded();
  return listTransactions(sku).slice(0, 100);
}

export interface CreateSkuInput {
  sku: string;
  productName: string;
  category: string;
  unit: string;
  location: string;
  reorderThreshold: number;
  quantityOnHand: number;
}

export async function createSkuAction(input: CreateSkuInput, role: UserRole, actor: string): Promise<InventoryActionResult> {
  ensureSeeded();
  if (!canManageInventory(role)) return { ok: false, error: "You don't have permission to manage inventory" };

  const sku = input.sku.trim().toUpperCase();
  if (!sku) return { ok: false, error: "SKU code is required" };
  if (skuExists(sku)) return { ok: false, error: `SKU ${sku} already exists` };
  if (!input.productName.trim()) return { ok: false, error: "Product name is required" };

  const item = createInventoryItem({
    sku,
    productName: input.productName.trim(),
    category: input.category.trim() || "Uncategorised",
    unit: input.unit.trim() || "unit",
    location: input.location.trim() || "Business Bay DC",
    reorderThreshold: Math.max(0, input.reorderThreshold),
    quantityOnHand: Math.max(0, input.quantityOnHand),
    reservedQuantity: 0,
  });

  recordAudit({ entityType: "INVENTORY", entityId: item.sku, action: `SKU ${item.sku} created`, actor, details: item.productName });
  return { ok: true };
}

export interface EditSkuInput {
  productName: string;
  category: string;
  unit: string;
  location: string;
  reorderThreshold: number;
}

export async function editSkuAction(sku: string, input: EditSkuInput, role: UserRole, actor: string): Promise<InventoryActionResult> {
  ensureSeeded();
  if (!canManageInventory(role)) return { ok: false, error: "You don't have permission to manage inventory" };

  const item = updateInventoryItem(sku, {
    productName: input.productName.trim(),
    category: input.category.trim(),
    unit: input.unit.trim(),
    location: input.location.trim(),
    reorderThreshold: Math.max(0, input.reorderThreshold),
  });
  if (!item) return { ok: false, error: "SKU not found" };

  recordAudit({ entityType: "INVENTORY", entityId: sku, action: `SKU ${sku} details updated`, actor });
  return { ok: true };
}

export async function restockAction(sku: string, quantity: number, role: UserRole, actor: string, note?: string): Promise<InventoryActionResult> {
  ensureSeeded();
  if (!canManageInventory(role)) return { ok: false, error: "You don't have permission to manage inventory" };
  if (quantity <= 0) return { ok: false, error: "Restock quantity must be greater than zero" };

  const item = adjustStock(sku, quantity, "RESTOCK", note || `Restocked by ${actor}`);
  if (!item) return { ok: false, error: "SKU not found" };

  recordAudit({ entityType: "INVENTORY", entityId: sku, action: `Restocked +${quantity}`, actor, details: note });
  return { ok: true };
}

export async function adjustStockAction(sku: string, delta: number, role: UserRole, actor: string, note: string): Promise<InventoryActionResult> {
  ensureSeeded();
  if (!canManageInventory(role)) return { ok: false, error: "You don't have permission to manage inventory" };
  if (delta === 0) return { ok: false, error: "Adjustment cannot be zero" };
  if (!note.trim()) return { ok: false, error: "A reason is required for stock adjustments" };

  const item = adjustStock(sku, delta, "ADJUSTMENT", note.trim());
  if (!item) return { ok: false, error: "SKU not found" };

  recordAudit({ entityType: "INVENTORY", entityId: sku, action: `Adjusted ${delta > 0 ? "+" : ""}${delta}`, actor, details: note.trim() });

  const state = stockState(item);
  if (state !== "AVAILABLE") {
    notify(
      "LOW_STOCK",
      state === "OUT_OF_STOCK" ? "Out of stock" : "Low stock alert",
      `${item.productName} (${item.sku}) ${state === "OUT_OF_STOCK" ? "is now out of stock" : "is below reorder threshold"} after adjustment.`,
    );
  }
  return { ok: true };
}

export async function getSkuDetail(sku: string) {
  ensureSeeded();
  const item = getInventoryBySku(sku);
  if (!item) return null;
  return { item, transactions: listTransactions(sku).slice(0, 50) };
}
