import type {
  AppNotification,
  AppSettings,
  AuditEntry,
  CompanyVehicle,
  DeliveryRun,
  Driver,
  DriverOwnedVehicle,
  InventoryItem,
  InventoryTransaction,
  Order,
  OrderStatusHistoryEntry,
  PlatformIntegration,
} from "@/types";

export interface StoreShape {
  orders: Order[];
  orderStatusHistory: OrderStatusHistoryEntry[];
  drivers: Driver[];
  driverOwnedVehicles: DriverOwnedVehicle[];
  vehicles: CompanyVehicle[];
  inventory: InventoryItem[];
  inventoryTransactions: InventoryTransaction[];
  deliveryRuns: DeliveryRun[];
  notifications: AppNotification[];
  auditLog: AuditEntry[];
  platformIntegrations: PlatformIntegration[];
  settings: AppSettings;
  seeded: boolean;
}

function emptyStore(): StoreShape {
  return {
    orders: [],
    orderStatusHistory: [],
    drivers: [],
    driverOwnedVehicles: [],
    vehicles: [],
    inventory: [],
    inventoryTransactions: [],
    deliveryRuns: [],
    notifications: [],
    auditLog: [],
    platformIntegrations: [],
    settings: { autoAcceptEnabled: true, updatedAt: new Date().toISOString() },
    seeded: false,
  };
}

// Persist across Next.js dev hot-reloads / module re-evaluation using a
// global singleton, mirroring how a real DB connection pool would behave.
const globalForStore = globalThis as unknown as { __dispatchStore?: StoreShape };

export const store: StoreShape = globalForStore.__dispatchStore ?? (globalForStore.__dispatchStore = emptyStore());

export function resetStore() {
  Object.assign(store, emptyStore());
}
