import { store } from "@/lib/store/data-store";
import { newId } from "@/lib/id";
import { computeDocumentStatus } from "@/lib/documents";
import type { Driver, DriverDocument, DriverOwnedVehicle } from "@/types";

export function listDrivers(): Driver[] {
  return store.drivers;
}

export function getDriver(id: string): Driver | undefined {
  return store.drivers.find((d) => d.id === id);
}

export function updateDriver(id: string, patch: Partial<Driver>): Driver | undefined {
  const driver = getDriver(id);
  if (!driver) return undefined;
  Object.assign(driver, patch, { updatedAt: new Date().toISOString() });
  return driver;
}

export function getOwnedVehicle(id: string): DriverOwnedVehicle | undefined {
  return store.driverOwnedVehicles.find((v) => v.id === id);
}

export function getOwnedVehicleByDriver(driverId: string): DriverOwnedVehicle | undefined {
  return store.driverOwnedVehicles.find((v) => v.driverId === driverId);
}

export function updateOwnedVehicle(id: string, patch: Partial<DriverOwnedVehicle>): DriverOwnedVehicle | undefined {
  const v = getOwnedVehicle(id);
  if (!v) return undefined;
  Object.assign(v, patch, { updatedAt: new Date().toISOString() });
  return v;
}

export function listOwnedVehicles(): DriverOwnedVehicle[] {
  return store.driverOwnedVehicles;
}

/**
 * Adds a new document of this type, or replaces the existing one of the
 * same type (e.g. renewing a licence) - a driver only ever has one current
 * document per type.
 */
export function upsertDriverDocument(
  driverId: string,
  input: {
    type: DriverDocument["type"];
    documentNumber: string;
    expiryDate?: string;
    fileRef: string;
    fileName?: string;
    mimeType?: string;
    dataUrl?: string;
    uploadedBy: string;
  },
): DriverDocument | undefined {
  const driver = getDriver(driverId);
  if (!driver) return undefined;

  const existing = driver.documents.find((d) => d.type === input.type);
  const now = new Date().toISOString();
  if (existing) {
    Object.assign(existing, {
      documentNumber: input.documentNumber,
      expiryDate: input.expiryDate,
      fileRef: input.fileRef,
      fileName: input.fileName,
      mimeType: input.mimeType,
      dataUrl: input.dataUrl,
      uploadedBy: input.uploadedBy,
      status: computeDocumentStatus(input.expiryDate),
      uploadedAt: now,
    });
    driver.updatedAt = now;
    return existing;
  }

  const doc: DriverDocument = {
    id: newId(),
    driverId,
    type: input.type,
    documentNumber: input.documentNumber,
    expiryDate: input.expiryDate,
    fileRef: input.fileRef,
    fileName: input.fileName,
    mimeType: input.mimeType,
    dataUrl: input.dataUrl,
    uploadedBy: input.uploadedBy,
    status: computeDocumentStatus(input.expiryDate),
    uploadedAt: now,
  };
  driver.documents.push(doc);
  driver.updatedAt = now;
  return doc;
}
