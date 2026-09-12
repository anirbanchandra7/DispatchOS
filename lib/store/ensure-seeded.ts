import { store } from "@/lib/store/data-store";
import { generateDrivers } from "@/lib/seed/seed-drivers";
import { generateCompanyVehicles } from "@/lib/seed/seed-vehicles";
import { generateInventory } from "@/lib/seed/seed-inventory";
import { generateOrders } from "@/lib/seed/seed-orders";
import { generateSeedAudit } from "@/lib/seed/seed-audit";
import { newId } from "@/lib/id";

export function ensureSeeded() {
  if (store.seeded) return;

  const inventory = generateInventory();
  const { drivers, ownedVehicles } = generateDrivers();
  const vehicles = generateCompanyVehicles();
  const { orders, statusHistory, deliveryRuns } = generateOrders(inventory, drivers, ownedVehicles, vehicles);

  store.inventory = inventory;
  store.drivers = drivers;
  store.driverOwnedVehicles = ownedVehicles;
  store.vehicles = vehicles;
  store.orders = orders;
  store.orderStatusHistory = statusHistory;
  store.deliveryRuns = deliveryRuns;
  store.platformIntegrations = [
    { id: newId(), platform: "UBER_EATS", isActive: true, mode: "MOCK", lastSyncAt: new Date().toISOString() },
    { id: newId(), platform: "DELIVEROO", isActive: true, mode: "MOCK", lastSyncAt: new Date().toISOString() },
  ];
  store.notifications = [];
  store.auditLog = generateSeedAudit(orders);
  store.settings = { autoAcceptEnabled: true, updatedAt: new Date().toISOString() };
  store.seeded = true;
}
