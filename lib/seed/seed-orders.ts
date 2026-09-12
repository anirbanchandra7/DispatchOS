import { newId } from "@/lib/id";
import { pickRandomArea, randomAreaPoint, randomDubaiAddress, randomRestaurantName, DEPOT_LOCATION } from "@/lib/geo-dubai";
import { buildRoute } from "@/lib/gps/routes";
import type {
  CompanyVehicle,
  DeliveryRun,
  Driver,
  DriverOwnedVehicle,
  InventoryItem,
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusHistoryEntry,
  Platform,
} from "@/types";

function randomPhone(): string {
  return `+9715${Math.floor(10000000 + Math.random() * 89999999)}`;
}

const CUSTOMER_NAMES = [
  "John Doe", "Sarah Ahmed", "Priya Menon", "Ahmed Al Marri", "Fatima Zahra",
  "David Lee", "Layla Hussain", "Omar Farouk", "Chen Wei", "Nadia Youssef",
  "Ali Raza", "Emma Wilson", "Khalid Saeed", "Meera Nair", "Yusuf Malik",
  "Sofia Rossi", "Hassan Abbas", "Grace Tan", "Ibrahim Nasser", "Anjali Rao",
  "Michael Brown", "Reem Al Suwaidi", "Karan Patel", "Noura Saif", "Daniel Kim",
];

function minutesFromNow(min: number): string {
  return new Date(Date.now() + min * 60_000).toISOString();
}
function minutesAgo(min: number): string {
  return minutesFromNow(-min);
}

interface OrderPlan {
  status: OrderStatus;
  orderTimeAgoMin: number;
  requestedDeliveryFromOrderMin: number;
}

// A realistic operational spread across the funnel for "today".
const ORDER_PLANS: OrderPlan[] = [
  { status: "RECEIVED", orderTimeAgoMin: 1, requestedDeliveryFromOrderMin: 35 },
  { status: "RECEIVED", orderTimeAgoMin: 3, requestedDeliveryFromOrderMin: 30 },
  { status: "ACCEPTED", orderTimeAgoMin: 6, requestedDeliveryFromOrderMin: 35 },
  { status: "ACCEPTED", orderTimeAgoMin: 14, requestedDeliveryFromOrderMin: 30 }, // will read as at-risk
  { status: "PICKING", orderTimeAgoMin: 9, requestedDeliveryFromOrderMin: 35 },
  { status: "PICKING", orderTimeAgoMin: 18, requestedDeliveryFromOrderMin: 30 },
  { status: "READY", orderTimeAgoMin: 15, requestedDeliveryFromOrderMin: 35 },
  { status: "READY", orderTimeAgoMin: 22, requestedDeliveryFromOrderMin: 30 },
  { status: "DRIVER_ASSIGNED", orderTimeAgoMin: 12, requestedDeliveryFromOrderMin: 35 },
  { status: "VEHICLE_ASSIGNED", orderTimeAgoMin: 10, requestedDeliveryFromOrderMin: 35 },
  { status: "DISPATCHED", orderTimeAgoMin: 8, requestedDeliveryFromOrderMin: 35 },
  { status: "OUT_FOR_DELIVERY", orderTimeAgoMin: 20, requestedDeliveryFromOrderMin: 40 },
  { status: "OUT_FOR_DELIVERY", orderTimeAgoMin: 30, requestedDeliveryFromOrderMin: 32 }, // at-risk
  { status: "DELIVERED", orderTimeAgoMin: 90, requestedDeliveryFromOrderMin: 35 },
  { status: "DELIVERED", orderTimeAgoMin: 120, requestedDeliveryFromOrderMin: 30 },
  { status: "DELIVERED", orderTimeAgoMin: 150, requestedDeliveryFromOrderMin: 35 },
  { status: "DELIVERED", orderTimeAgoMin: 200, requestedDeliveryFromOrderMin: 30 },
  { status: "DELIVERED", orderTimeAgoMin: 240, requestedDeliveryFromOrderMin: 35 },
  { status: "DELIVERED", orderTimeAgoMin: 300, requestedDeliveryFromOrderMin: 30 },
  { status: "CANCELLED", orderTimeAgoMin: 60, requestedDeliveryFromOrderMin: 30 },
  { status: "FAILED", orderTimeAgoMin: 180, requestedDeliveryFromOrderMin: 30 },
];

export interface SeedOrdersResult {
  orders: Order[];
  statusHistory: OrderStatusHistoryEntry[];
  deliveryRuns: DeliveryRun[];
}

export function generateOrders(
  inventory: InventoryItem[],
  drivers: Driver[],
  ownedVehicles: DriverOwnedVehicle[],
  vehicles: CompanyVehicle[],
): SeedOrdersResult {
  const orders: Order[] = [];
  const statusHistory: OrderStatusHistoryEntry[] = [];
  const deliveryRuns: DeliveryRun[] = [];

  let driverCursor = 0;
  const activeSlotsNeeded = ORDER_PLANS.filter((p) =>
    ["DRIVER_ASSIGNED", "VEHICLE_ASSIGNED", "DISPATCHED", "OUT_FOR_DELIVERY"].includes(p.status),
  ).length;
  // Reserve a handful of AVAILABLE drivers that stay fully free (no active
  // order), so the Dispatch workflow always has assignable candidates out
  // of the box — but never reserve so many that active order slots below
  // run out of distinct drivers and end up double-booked.
  const availableDrivers = drivers.filter((d) => d.status === "AVAILABLE");
  const reserveFreeCount = Math.min(3, Math.max(0, availableDrivers.length - activeSlotsNeeded));
  const availableForBusy = availableDrivers.slice(0, Math.max(0, availableDrivers.length - reserveFreeCount));

  let extSeq = 10200;

  ORDER_PLANS.forEach((plan, idx) => {
    const platform: Platform = idx % 2 === 0 ? "DELIVEROO" : "UBER_EATS";
    extSeq += Math.floor(Math.random() * 3) + 1;
    const pickupArea = pickRandomArea();
    const deliveryArea = pickRandomArea();
    const pickupPoint = randomAreaPoint(pickupArea, 0.8);
    const deliveryPoint = randomAreaPoint(deliveryArea, 1.5);

    const itemCount = 1 + Math.floor(Math.random() * 3);
    const items: OrderItem[] = [];
    const orderId = newId();
    const usedSkus = new Set<string>();
    for (let i = 0; i < itemCount; i++) {
      const invItem = inventory[Math.floor(Math.random() * inventory.length)];
      if (usedSkus.has(invItem.sku)) continue;
      usedSkus.add(invItem.sku);
      const quantity = 1 + Math.floor(Math.random() * 3);
      const unitPrice = Math.round((8 + Math.random() * 55) * 100) / 100;
      items.push({ id: newId(), orderId, sku: invItem.sku, productName: invItem.productName, quantity, unitPrice });
    }
    const orderValue = Math.round(items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) * 100) / 100;

    const orderTime = minutesAgo(plan.orderTimeAgoMin);
    const requestedDeliveryTime = new Date(
      new Date(orderTime).getTime() + plan.requestedDeliveryFromOrderMin * 60_000,
    ).toISOString();

    const isActive = ["DRIVER_ASSIGNED", "VEHICLE_ASSIGNED", "DISPATCHED", "OUT_FOR_DELIVERY"].includes(plan.status);
    let driver: Driver | undefined;
    let vehicleId: string | undefined;
    let vehicleOwnership: Order["vehicleOwnership"];

    if (isActive && availableForBusy.length > 0) {
      driver = availableForBusy[driverCursor % availableForBusy.length];
      driverCursor += 1;
      driver.status = "BUSY";
      driver.currentOrderId = orderId;

      if (driver.hasOwnVehicle && driver.ownVehicleId) {
        const ov = ownedVehicles.find((v) => v.id === driver!.ownVehicleId);
        if (ov) {
          ov.status = "ASSIGNED";
          vehicleId = ov.id;
          vehicleOwnership = "DRIVER_OWNED";
        }
      } else {
        const cv = vehicles.find((v) => v.status === "AVAILABLE" && !v.currentDriverId);
        if (cv) {
          cv.status = "ASSIGNED";
          cv.currentDriverId = driver.id;
          vehicleId = cv.id;
          vehicleOwnership = "COMPANY";
        }
      }
    }

    const order: Order = {
      id: orderId,
      externalOrderId: platform === "UBER_EATS" ? `UE-${extSeq}` : `DLV-${extSeq}`,
      source: platform,
      customerName: CUSTOMER_NAMES[idx % CUSTOMER_NAMES.length],
      customerPhone: randomPhone(),
      customerAddress: randomDubaiAddress(deliveryArea),
      deliveryLat: deliveryPoint.lat,
      deliveryLng: deliveryPoint.lng,
      orderTime,
      requestedDeliveryTime,
      items,
      orderValue,
      paymentMethod: (["CARD", "CASH", "WALLET", "ONLINE"] as const)[idx % 4],
      status: plan.status,
      fulfilmentStatus:
        plan.status === "RECEIVED"
          ? "PENDING"
          : ["CANCELLED", "FAILED"].includes(plan.status)
            ? "CANCELLED"
            : ["DELIVERED"].includes(plan.status)
              ? "COMPLETED"
              : plan.status === "READY" || isActive
                ? "READY"
                : "IN_PROGRESS",
      driverId: driver?.id,
      vehicleId,
      vehicleOwnership,
      deliveryNotes: idx % 5 === 0 ? "Leave at the lobby with security desk" : undefined,
      pickupLat: pickupPoint.lat,
      pickupLng: pickupPoint.lng,
      pickupName: `${randomRestaurantName()} - ${pickupArea.name}`,
      createdAt: orderTime,
      updatedAt: orderTime,
      acceptedAt: plan.status === "RECEIVED" ? undefined : minutesAgo(plan.orderTimeAgoMin - 1),
      readyAt: ["READY", "DRIVER_ASSIGNED", "VEHICLE_ASSIGNED", "DISPATCHED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(
        plan.status,
      )
        ? minutesAgo(Math.max(0, plan.orderTimeAgoMin - 6))
        : undefined,
      dispatchedAt: ["DISPATCHED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(plan.status)
        ? minutesAgo(Math.max(0, plan.orderTimeAgoMin - 8))
        : undefined,
      collectedAt: ["OUT_FOR_DELIVERY", "DELIVERED"].includes(plan.status)
        ? minutesAgo(Math.max(0, plan.orderTimeAgoMin - 14))
        : undefined,
      deliveredAt: plan.status === "DELIVERED" ? minutesAgo(Math.max(0, plan.orderTimeAgoMin - 28)) : undefined,
      cancelledAt: plan.status === "CANCELLED" ? minutesAgo(Math.max(0, plan.orderTimeAgoMin - 5)) : undefined,
      cancelReason: plan.status === "CANCELLED" ? "Customer requested cancellation" : undefined,
    };
    orders.push(order);

    statusHistory.push({
      id: newId(),
      orderId,
      status: "RECEIVED",
      changedAt: orderTime,
      changedBy: `${platform === "UBER_EATS" ? "Uber Eats" : "Deliveroo"} Integration`,
      note: "Order received from platform",
    });
    if (order.status !== "RECEIVED") {
      statusHistory.push({
        id: newId(),
        orderId,
        status: order.status,
        changedAt: order.updatedAt,
        changedBy: "System (seed)",
      });
    }

    if (plan.status === "DISPATCHED" && driver) {
      // Pickup leg: driver's seeded position -> pickup. Occasionally park
      // the run at AT_PICKUP so the Fulfilment/driver flow has an example
      // ready to collect without waiting for the GPS tick to arrive.
      const parked = Math.random() < 0.4;
      const route = buildRoute({ lat: driver.currentLat, lng: driver.currentLng }, { lat: order.pickupLat, lng: order.pickupLng }, 1);
      deliveryRuns.push({
        id: newId(),
        orderId,
        driverId: driver.id,
        routePoints: route,
        progress: parked ? 1 : 0.2 + Math.random() * 0.5,
        startedAt: order.dispatchedAt ?? orderTime,
        status: parked ? "AT_PICKUP" : "EN_ROUTE_PICKUP",
        speedKmh: 28 + Math.random() * 20,
        lastGpsUpdate: new Date().toISOString(),
      });
    } else if (plan.status === "OUT_FOR_DELIVERY" && driver) {
      // Customer leg: pickup -> customer, already collected.
      const parked = Math.random() < 0.25;
      const route = buildRoute({ lat: order.pickupLat, lng: order.pickupLng }, { lat: order.deliveryLat, lng: order.deliveryLng }, 2);
      deliveryRuns.push({
        id: newId(),
        orderId,
        driverId: driver.id,
        routePoints: route,
        progress: parked ? 1 : 0.15 + Math.random() * 0.55,
        startedAt: order.collectedAt ?? orderTime,
        status: parked ? "ARRIVED_AT_CUSTOMER" : "EN_ROUTE_CUSTOMER",
        speedKmh: 28 + Math.random() * 20,
        lastGpsUpdate: new Date().toISOString(),
      });
    }
  });

  return { orders, statusHistory, deliveryRuns };
}

export { DEPOT_LOCATION };
