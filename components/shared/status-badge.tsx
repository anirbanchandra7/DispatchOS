import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  CompanyVehicleStatus,
  DocumentStatus,
  DriverOwnedVehicleStatus,
  DriverStatus,
  FulfilmentStatus,
  OrderStatus,
} from "@/types";

const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  RECEIVED: "bg-blue-50 text-blue-700 border-blue-200",
  ACCEPTED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  PICKING: "bg-amber-50 text-amber-700 border-amber-200",
  READY: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DRIVER_ASSIGNED: "bg-teal-50 text-teal-700 border-teal-200",
  VEHICLE_ASSIGNED: "bg-cyan-50 text-cyan-700 border-cyan-200",
  DISPATCHED: "bg-purple-50 text-purple-700 border-purple-200",
  OUT_FOR_DELIVERY: "bg-violet-50 text-violet-700 border-violet-200",
  DELIVERED: "bg-green-50 text-green-700 border-green-200",
  CANCELLED: "bg-gray-100 text-gray-600 border-gray-200",
  FAILED: "bg-red-50 text-red-700 border-red-200",
};

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  RECEIVED: "Received",
  ACCEPTED: "Accepted",
  PICKING: "Picking",
  READY: "Ready",
  DRIVER_ASSIGNED: "Driver Assigned",
  VEHICLE_ASSIGNED: "Vehicle Assigned",
  DISPATCHED: "Dispatched",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  FAILED: "Failed",
};

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", ORDER_STATUS_STYLES[status], className)}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}

const DRIVER_STATUS_STYLES: Record<DriverStatus, string> = {
  AVAILABLE: "bg-green-50 text-green-700 border-green-200",
  BUSY: "bg-blue-50 text-blue-700 border-blue-200",
  ON_BREAK: "bg-amber-50 text-amber-700 border-amber-200",
  OFFLINE: "bg-gray-100 text-gray-500 border-gray-200",
  INACTIVE: "bg-red-50 text-red-600 border-red-200",
};

export function DriverStatusBadge({ status, className }: { status: DriverStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", DRIVER_STATUS_STYLES[status], className)}>
      {status.replace("_", " ")}
    </Badge>
  );
}

const VEHICLE_STATUS_STYLES: Record<CompanyVehicleStatus | DriverOwnedVehicleStatus, string> = {
  AVAILABLE: "bg-green-50 text-green-700 border-green-200",
  ASSIGNED: "bg-blue-50 text-blue-700 border-blue-200",
  IN_TRANSIT: "bg-purple-50 text-purple-700 border-purple-200",
  IN_SERVICE: "bg-cyan-50 text-cyan-700 border-cyan-200",
  MAINTENANCE: "bg-amber-50 text-amber-700 border-amber-200",
  INACTIVE: "bg-gray-100 text-gray-500 border-gray-200",
};

export function VehicleStatusBadge({
  status,
  className,
}: {
  status: CompanyVehicleStatus | DriverOwnedVehicleStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("font-medium", VEHICLE_STATUS_STYLES[status], className)}>
      {status.replace("_", " ")}
    </Badge>
  );
}

const FULFILMENT_STATUS_STYLES: Record<FulfilmentStatus, string> = {
  PENDING: "bg-gray-100 text-gray-600 border-gray-200",
  IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-200",
  READY: "bg-emerald-50 text-emerald-700 border-emerald-200",
  COMPLETED: "bg-green-50 text-green-700 border-green-200",
  CANCELLED: "bg-red-50 text-red-600 border-red-200",
};

export function FulfilmentStatusBadge({ status, className }: { status: FulfilmentStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", FULFILMENT_STATUS_STYLES[status], className)}>
      {status.replace("_", " ")}
    </Badge>
  );
}

const DOCUMENT_STATUS_STYLES: Record<DocumentStatus, string> = {
  VALID: "bg-green-50 text-green-700 border-green-200",
  EXPIRING_SOON: "bg-amber-50 text-amber-700 border-amber-200",
  EXPIRED: "bg-red-50 text-red-700 border-red-200",
};

export function DocumentStatusBadge({ status, className }: { status: DocumentStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium text-xs", DOCUMENT_STATUS_STYLES[status], className)}>
      {status.replace("_", " ")}
    </Badge>
  );
}
