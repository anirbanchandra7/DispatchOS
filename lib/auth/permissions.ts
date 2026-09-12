import type { UserRole } from "@/types";

export type NavKey =
  | "dashboard"
  | "orders"
  | "fulfilment"
  | "dispatch"
  | "control-tower"
  | "drivers"
  | "vehicles"
  | "inventory"
  | "reports"
  | "settings"
  | "my-deliveries";

export const ROLE_NAV: Record<UserRole, NavKey[]> = {
  ADMIN: [
    "dashboard",
    "orders",
    "fulfilment",
    "dispatch",
    "control-tower",
    "drivers",
    "vehicles",
    "inventory",
    "reports",
    "settings",
  ],
  OPERATIONS_MANAGER: [
    "dashboard",
    "orders",
    "fulfilment",
    "dispatch",
    "drivers",
    "vehicles",
    "inventory",
    "control-tower",
    "reports",
    "settings",
  ],
  FULFILMENT_OPERATOR: ["orders", "fulfilment", "inventory"],
  DISPATCHER: ["orders", "dispatch", "drivers", "vehicles", "control-tower"],
  DRIVER: ["my-deliveries", "settings"],
};

export const NAV_ROUTES: Record<NavKey, string> = {
  dashboard: "/dashboard",
  orders: "/orders",
  fulfilment: "/fulfilment",
  dispatch: "/dispatch",
  "control-tower": "/control-tower",
  drivers: "/drivers",
  vehicles: "/vehicles",
  inventory: "/inventory",
  reports: "/reports",
  settings: "/settings",
  "my-deliveries": "/my-deliveries",
};

export function canAccess(role: UserRole, key: NavKey): boolean {
  return ROLE_NAV[role].includes(key);
}

export function canAccessPath(role: UserRole, pathname: string): boolean {
  const entry = Object.entries(NAV_ROUTES).find(([, route]) => pathname.startsWith(route));
  if (!entry) return true; // unknown/public route
  const [key] = entry as [NavKey, string];
  return canAccess(role, key);
}

export function defaultRouteForRole(role: UserRole): string {
  const nav = ROLE_NAV[role];
  return NAV_ROUTES[nav[0]];
}

/** Roles allowed to create SKUs, restock, and adjust inventory counts. */
const INVENTORY_MANAGER_ROLES: UserRole[] = ["ADMIN", "OPERATIONS_MANAGER", "FULFILMENT_OPERATOR"];

export function canManageInventory(role: UserRole): boolean {
  return INVENTORY_MANAGER_ROLES.includes(role);
}

/** Roles allowed to change operational settings (e.g. auto-accept). */
const SETTINGS_MANAGER_ROLES: UserRole[] = ["ADMIN", "OPERATIONS_MANAGER"];

export function canManageSettings(role: UserRole): boolean {
  return SETTINGS_MANAGER_ROLES.includes(role);
}

/** Roles allowed to add company vehicles and upload their documents. */
const VEHICLE_MANAGER_ROLES: UserRole[] = ["ADMIN"];

export function canManageVehicles(role: UserRole): boolean {
  return VEHICLE_MANAGER_ROLES.includes(role);
}

/** Roles allowed to view uploaded vehicle documents (insurance, registration, etc). */
const VEHICLE_DOCUMENT_VIEWER_ROLES: UserRole[] = ["ADMIN", "OPERATIONS_MANAGER"];

export function canViewVehicleDocuments(role: UserRole): boolean {
  return VEHICLE_DOCUMENT_VIEWER_ROLES.includes(role);
}

/** Roles allowed to upload/replace a driver's documents (licence, ID, etc). */
const DRIVER_DOCUMENT_MANAGER_ROLES: UserRole[] = ["ADMIN"];

export function canManageDriverDocuments(role: UserRole): boolean {
  return DRIVER_DOCUMENT_MANAGER_ROLES.includes(role);
}

/** Roles allowed to view a driver's uploaded documents. */
const DRIVER_DOCUMENT_VIEWER_ROLES: UserRole[] = ["ADMIN", "OPERATIONS_MANAGER"];

export function canViewDriverDocuments(role: UserRole): boolean {
  return DRIVER_DOCUMENT_VIEWER_ROLES.includes(role);
}
