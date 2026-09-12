// Core domain types for the Last Mile Dispatch & Fulfilment platform.
// These mirror /database/schema.sql exactly so a future Supabase-backed
// repository implementation can swap in without changing calling code.

export type UUID = string;

// ---------- Enums ----------

export type Platform = "UBER_EATS" | "DELIVEROO";

export type OrderStatus =
  | "RECEIVED"
  | "ACCEPTED"
  | "PICKING"
  | "READY"
  | "DRIVER_ASSIGNED"
  | "VEHICLE_ASSIGNED"
  | "DISPATCHED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "FAILED";

export type FulfilmentStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "READY"
  | "COMPLETED"
  | "CANCELLED";

export type PaymentMethod = "CARD" | "CASH" | "WALLET" | "ONLINE";

export type DriverStatus = "AVAILABLE" | "BUSY" | "ON_BREAK" | "OFFLINE" | "INACTIVE";

export type EmploymentType = "FULL_TIME" | "PART_TIME" | "GIG";

export type DriverOwnedVehicleStatus =
  | "AVAILABLE"
  | "ASSIGNED"
  | "IN_SERVICE"
  | "MAINTENANCE"
  | "INACTIVE";

export type CompanyVehicleStatus =
  | "AVAILABLE"
  | "ASSIGNED"
  | "IN_TRANSIT"
  | "MAINTENANCE"
  | "INACTIVE";

export type VehicleType = "MOTORBIKE" | "SCOOTER" | "CAR" | "VAN" | "TRUCK" | "BICYCLE";

export type VehicleOwnership = "DRIVER_OWNED" | "COMPANY";

export type DocumentType =
  | "DRIVING_LICENCE"
  | "ID_DOCUMENT"
  | "VEHICLE_REGISTRATION"
  | "VEHICLE_INSURANCE"
  | "OTHER";

export type DocumentStatus = "VALID" | "EXPIRING_SOON" | "EXPIRED";

export type UserRole =
  | "ADMIN"
  | "OPERATIONS_MANAGER"
  | "FULFILMENT_OPERATOR"
  | "DISPATCHER"
  | "DRIVER";

export type SlaState = "ON_TRACK" | "AT_RISK" | "BREACHED";

export type NotificationType =
  | "ORDER_RECEIVED"
  | "ORDER_AT_RISK"
  | "DRIVER_ASSIGNED"
  | "VEHICLE_ASSIGNED"
  | "ORDER_DISPATCHED"
  | "ORDER_COLLECTED"
  | "ORDER_DELIVERED"
  | "ORDER_FAILED"
  | "ORDER_HELD_STOCK"
  | "DRIVER_ARRIVED"
  | "DOCUMENT_EXPIRING"
  | "LOW_STOCK"
  | "GENERIC";

export type InventoryTransactionType = "RESERVE" | "RELEASE" | "DEDUCT" | "RESTOCK" | "ADJUSTMENT";

// ---------- Geo ----------

export interface GeoPoint {
  lat: number;
  lng: number;
}

// ---------- Users / Auth ----------

export interface AppUser {
  id: UUID;
  fullName: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// ---------- Orders ----------

export interface OrderItem {
  id: UUID;
  orderId: UUID;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: UUID;
  externalOrderId: string;
  source: Platform;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  orderTime: string;
  requestedDeliveryTime: string;
  items: OrderItem[];
  orderValue: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  fulfilmentStatus: FulfilmentStatus;
  driverId?: UUID;
  vehicleId?: UUID;
  vehicleOwnership?: VehicleOwnership;
  deliveryNotes?: string;
  pickupLat: number;
  pickupLng: number;
  pickupName: string;
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  readyAt?: string;
  dispatchedAt?: string;
  arrivedAtPickupAt?: string;
  collectedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  failureReason?: string;
  autoAccepted?: boolean;
}

export interface OrderStatusHistoryEntry {
  id: UUID;
  orderId: UUID;
  status: OrderStatus;
  changedAt: string;
  changedBy: string;
  note?: string;
}

// ---------- Driver documents ----------

export interface DriverDocument {
  id: UUID;
  driverId: UUID;
  type: DocumentType;
  documentNumber: string;
  expiryDate?: string;
  fileRef: string; // opaque storage pointer (production: Supabase Storage key)
  status: DocumentStatus;
  uploadedAt: string;
  /** Original uploaded filename, e.g. "licence-2027.pdf". Unset for seed/mock documents. */
  fileName?: string;
  /** MIME type of the uploaded file, used to decide how to preview it. */
  mimeType?: string;
  /** Base64 data URI of the uploaded file — mock "storage" for this demo. */
  dataUrl?: string;
  uploadedBy?: string;
}

// ---------- Driver-owned vehicle ----------

export interface DriverOwnedVehicle {
  id: UUID;
  driverId: UUID;
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  vehicleType: VehicleType;
  colour: string;
  insuranceExpiry: string;
  registrationExpiry: string;
  status: DriverOwnedVehicleStatus;
  capacityKg: number;
  documents: VehicleDocument[];
  createdAt: string;
  updatedAt: string;
}

// ---------- Driver ----------

export interface Driver {
  id: UUID;
  fullName: string;
  phone: string;
  avatarUrl: string;
  licenceNumber: string;
  licenceExpiry: string;
  status: DriverStatus;
  employmentType: EmploymentType;
  hasOwnVehicle: boolean;
  ownVehicleId?: UUID;
  currentLat: number;
  currentLng: number;
  currentLocationLabel: string;
  currentOrderId?: UUID;
  shiftStart: string;
  shiftEnd: string;
  onShift: boolean;
  deliveryCount: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  rating: number;
  documents: DriverDocument[];
  homeDepotLat: number;
  homeDepotLng: number;
  createdAt: string;
  updatedAt: string;
}

// ---------- Company vehicle documents ----------

export interface VehicleDocument {
  id: UUID;
  vehicleId: UUID;
  type: DocumentType;
  expiryDate: string;
  fileRef: string;
  status: DocumentStatus;
  /** Original uploaded filename, e.g. "insurance-2026.pdf". Unset for seed/mock documents. */
  fileName?: string;
  /** MIME type of the uploaded file, used to decide how to preview it. */
  mimeType?: string;
  /** Base64 data URI of the uploaded file — this is the mock "storage" for the demo. */
  dataUrl?: string;
  uploadedAt?: string;
  uploadedBy?: string;
}

// ---------- Company vehicle ----------

export interface CompanyVehicle {
  id: UUID;
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  vehicleType: VehicleType;
  capacityKg: number;
  status: CompanyVehicleStatus;
  insuranceExpiry: string;
  registrationExpiry: string;
  inspectionExpiry: string;
  documents: VehicleDocument[];
  currentDriverId?: UUID;
  currentLat: number;
  currentLng: number;
  createdAt: string;
  updatedAt: string;
}

// Unified vehicle option used by the allocation engine / picker UI
export interface VehicleOption {
  id: UUID;
  ownership: VehicleOwnership;
  registrationNumber: string;
  make: string;
  model: string;
  vehicleType: VehicleType;
  capacityKg: number;
  available: boolean;
  recommended: boolean;
  driverId?: UUID; // set for driver-owned vehicles
  statusLabel: string;
}

export interface DriverOption {
  id: UUID;
  fullName: string;
  avatarUrl: string;
  distanceKm: number;
  status: DriverStatus;
  currentVehicleLabel?: string;
  activeDeliveries: number;
  deliveryCount: number;
  onShift: boolean;
  recommended: boolean;
}

// ---------- Inventory ----------

export interface InventoryItem {
  id: UUID;
  sku: string;
  productName: string;
  category: string;
  quantityOnHand: number;
  reservedQuantity: number;
  reorderThreshold: number;
  unit: string;
  location: string;
  updatedAt: string;
}

export interface InventoryTransaction {
  id: UUID;
  sku: string;
  type: InventoryTransactionType;
  quantity: number;
  orderId?: UUID;
  note?: string;
  createdAt: string;
}

// ---------- Fulfilment / dispatch / delivery run ----------

export interface Fulfilment {
  id: UUID;
  orderId: UUID;
  status: FulfilmentStatus;
  startedAt?: string;
  readyAt?: string;
  completedAt?: string;
}

export interface Dispatch {
  id: UUID;
  orderId: UUID;
  driverId: UUID;
  vehicleId: UUID;
  vehicleOwnership: VehicleOwnership;
  dispatchedAt: string;
  etaMinutes: number;
  dispatchedBy: string;
}

export type DeliveryRunStatus =
  | "EN_ROUTE_PICKUP"
  | "AT_PICKUP"
  | "EN_ROUTE_CUSTOMER"
  | "ARRIVED_AT_CUSTOMER"
  | "DELIVERED";

export interface DeliveryRun {
  id: UUID;
  orderId: UUID;
  driverId: UUID;
  routePoints: GeoPoint[];
  progress: number; // 0..1 along the current leg's route
  startedAt: string;
  completedAt?: string;
  status: DeliveryRunStatus;
  speedKmh: number;
  lastGpsUpdate: string;
}

// ---------- GPS ----------

export interface GpsLocation {
  driverId: UUID;
  lat: number;
  lng: number;
  speedKmh: number;
  heading: number;
  recordedAt: string;
}

// ---------- Platform integrations ----------

export interface PlatformIntegration {
  id: UUID;
  platform: Platform;
  isActive: boolean;
  lastSyncAt?: string;
  mode: "MOCK" | "LIVE";
}

// ---------- Notifications ----------

export interface AppNotification {
  id: UUID;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  relatedOrderId?: UUID;
  relatedDriverId?: UUID;
  relatedVehicleId?: UUID;
}

// ---------- Audit ----------

export interface AuditEntry {
  id: UUID;
  entityType: "ORDER" | "DRIVER" | "VEHICLE" | "INVENTORY" | "SETTINGS";
  entityId: UUID;
  action: string;
  actor: string;
  timestamp: string;
  details?: string;
}

// ---------- SLA ----------

export interface SlaInfo {
  state: SlaState;
  deadline: string;
  remainingSeconds: number;
  label: string;
}

// ---------- Settings ----------

export interface AppSettings {
  autoAcceptEnabled: boolean;
  updatedAt: string;
  updatedBy?: string;
}
