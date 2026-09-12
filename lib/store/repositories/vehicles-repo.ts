import { store } from "@/lib/store/data-store";
import { newId } from "@/lib/id";
import { computeDocumentStatus } from "@/lib/documents";
import type { CompanyVehicle, VehicleDocument } from "@/types";

export function listVehicles(): CompanyVehicle[] {
  return store.vehicles;
}

export function getVehicle(id: string): CompanyVehicle | undefined {
  return store.vehicles.find((v) => v.id === id);
}

export function registrationExists(registrationNumber: string): boolean {
  return store.vehicles.some((v) => v.registrationNumber.toLowerCase() === registrationNumber.toLowerCase());
}

export function updateVehicle(id: string, patch: Partial<CompanyVehicle>): CompanyVehicle | undefined {
  const v = getVehicle(id);
  if (!v) return undefined;
  Object.assign(v, patch, { updatedAt: new Date().toISOString() });
  return v;
}

export function createVehicle(
  input: Omit<CompanyVehicle, "id" | "documents" | "createdAt" | "updatedAt" | "currentLat" | "currentLng" | "currentDriverId">,
): CompanyVehicle {
  const now = new Date().toISOString();
  const vehicle: CompanyVehicle = {
    ...input,
    id: newId(),
    documents: [],
    currentLat: 25.1857,
    currentLng: 55.2762, // depot default until the vehicle is dispatched
    createdAt: now,
    updatedAt: now,
  };
  store.vehicles.push(vehicle);
  return vehicle;
}

export function addVehicleDocument(
  vehicleId: string,
  doc: Omit<VehicleDocument, "id" | "vehicleId" | "status" | "uploadedAt"> & { uploadedBy: string },
): VehicleDocument | undefined {
  const vehicle = getVehicle(vehicleId);
  if (!vehicle) return undefined;
  const fullDoc: VehicleDocument = {
    ...doc,
    id: newId(),
    vehicleId,
    status: computeDocumentStatus(doc.expiryDate),
    uploadedAt: new Date().toISOString(),
  };
  vehicle.documents.push(fullDoc);
  vehicle.updatedAt = new Date().toISOString();
  return fullDoc;
}
