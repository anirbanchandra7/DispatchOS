import { newId, nextExternalOrderId } from "@/lib/id";
import { pickRandomArea, randomAreaPoint, randomDubaiAddress, randomRestaurantName } from "@/lib/geo-dubai";
import { listInventory } from "@/lib/store/repositories/inventory-repo";
import type { Order, OrderItem, Platform } from "@/types";

const CUSTOMER_NAMES = [
  "Layla Hassan", "Tom Richards", "Aisha Karim", "Ben Walker", "Noor Fatima",
  "Kevin Tan", "Salma Idris", "James Carter", "Divya Shah", "Hamdan Rashid",
];

function randomPhone(): string {
  return `+9715${Math.floor(10000000 + Math.random() * 89999999)}`;
}

export function generateMockOrder(platform: Platform): Order {
  const inventory = listInventory();
  const pickupArea = pickRandomArea();
  const deliveryArea = pickRandomArea();
  const pickupPoint = randomAreaPoint(pickupArea, 0.8);
  const deliveryPoint = randomAreaPoint(deliveryArea, 1.5);
  const orderId = newId();

  const itemCount = 1 + Math.floor(Math.random() * 3);
  const items: OrderItem[] = [];
  const usedSkus = new Set<string>();
  const pool = inventory.length > 0 ? inventory : [];
  for (let i = 0; i < itemCount && pool.length > 0; i++) {
    const invItem = pool[Math.floor(Math.random() * pool.length)];
    if (usedSkus.has(invItem.sku)) continue;
    usedSkus.add(invItem.sku);
    const quantity = 1 + Math.floor(Math.random() * 3);
    const unitPrice = Math.round((8 + Math.random() * 55) * 100) / 100;
    items.push({ id: newId(), orderId, sku: invItem.sku, productName: invItem.productName, quantity, unitPrice });
  }
  const orderValue = Math.round(items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) * 100) / 100;
  const now = new Date().toISOString();

  return {
    id: orderId,
    externalOrderId: nextExternalOrderId(platform),
    source: platform,
    customerName: CUSTOMER_NAMES[Math.floor(Math.random() * CUSTOMER_NAMES.length)],
    customerPhone: randomPhone(),
    customerAddress: randomDubaiAddress(deliveryArea),
    deliveryLat: deliveryPoint.lat,
    deliveryLng: deliveryPoint.lng,
    orderTime: now,
    requestedDeliveryTime: new Date(Date.now() + 35 * 60_000).toISOString(),
    items,
    orderValue: orderValue || 24.5,
    paymentMethod: (["CARD", "CASH", "WALLET", "ONLINE"] as const)[Math.floor(Math.random() * 4)],
    status: "RECEIVED",
    fulfilmentStatus: "PENDING",
    pickupLat: pickupPoint.lat,
    pickupLng: pickupPoint.lng,
    pickupName: `${randomRestaurantName()} - ${pickupArea.name}`,
    createdAt: now,
    updatedAt: now,
  };
}
