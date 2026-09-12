"use server";

import { ensureSeeded } from "@/lib/store/ensure-seeded";
import {
  listVehicles,
  getVehicle,
  createVehicle,
  registrationExists,
  addVehicleDocument,
} from "@/lib/store/repositories/vehicles-repo";
import { canManageVehicles } from "@/lib/auth/permissions";
import { recordAudit } from "@/lib/audit/audit-log";
import type { CompanyVehicleStatus, DocumentType, UserRole, VehicleType } from "@/types";

export type VehicleActionResult = { ok: true; vehicleId?: string } | { ok: false; error: string };

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB per document

export async function getVehicles() {
  ensureSeeded();
  return listVehicles();
}

export async function getVehicleById(id: string) {
  ensureSeeded();
  return getVehicle(id) ?? null;
}

export interface CreateVehicleInput {
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  vehicleType: VehicleType;
  capacityKg: number;
  insuranceExpiry: string;
  registrationExpiry: string;
  inspectionExpiry: string;
  status?: CompanyVehicleStatus;
}

export interface DocumentUploadInput {
  type: DocumentType;
  expiryDate: string;
  fileName: string;
  mimeType: string;
  dataUrl: string;
}

function validateUpload(doc: DocumentUploadInput): string | undefined {
  if (!doc.fileName.trim()) return "A file is required";
  if (!doc.expiryDate) return "An expiry date is required for this document";
  // Rough size check: base64 payload is ~4/3 the original byte size.
  const approxBytes = (doc.dataUrl.length * 3) / 4;
  if (approxBytes > MAX_UPLOAD_BYTES) return "File is too large (max 5MB)";
  return undefined;
}

export async function createVehicleAction(
  input: CreateVehicleInput,
  documents: DocumentUploadInput[],
  role: UserRole,
  actor: string,
): Promise<VehicleActionResult> {
  ensureSeeded();
  if (!canManageVehicles(role)) return { ok: false, error: "You don't have permission to add vehicles" };

  const registrationNumber = input.registrationNumber.trim().toUpperCase();
  if (!registrationNumber) return { ok: false, error: "Registration number is required" };
  if (registrationExists(registrationNumber)) return { ok: false, error: `A vehicle with registration ${registrationNumber} already exists` };
  if (!input.make.trim() || !input.model.trim()) return { ok: false, error: "Make and model are required" };

  for (const doc of documents) {
    const error = validateUpload(doc);
    if (error) return { ok: false, error };
  }

  const vehicle = createVehicle({
    registrationNumber,
    make: input.make.trim(),
    model: input.model.trim(),
    year: input.year,
    vehicleType: input.vehicleType,
    capacityKg: Math.max(0, input.capacityKg),
    status: input.status ?? "AVAILABLE",
    insuranceExpiry: input.insuranceExpiry,
    registrationExpiry: input.registrationExpiry,
    inspectionExpiry: input.inspectionExpiry,
  });

  for (const doc of documents) {
    addVehicleDocument(vehicle.id, {
      type: doc.type,
      expiryDate: doc.expiryDate,
      fileRef: `mock-upload://${vehicle.id}/${doc.fileName}`,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      dataUrl: doc.dataUrl,
      uploadedBy: actor,
    });
  }

  recordAudit({
    entityType: "VEHICLE",
    entityId: vehicle.id,
    action: `Vehicle ${vehicle.registrationNumber} added`,
    actor,
    details: `${vehicle.make} ${vehicle.model}${documents.length > 0 ? ` with ${documents.length} document(s)` : ""}`,
  });

  return { ok: true, vehicleId: vehicle.id };
}

export async function uploadVehicleDocumentAction(
  vehicleId: string,
  doc: DocumentUploadInput,
  role: UserRole,
  actor: string,
): Promise<VehicleActionResult> {
  ensureSeeded();
  if (!canManageVehicles(role)) return { ok: false, error: "You don't have permission to upload vehicle documents" };

  const vehicle = getVehicle(vehicleId);
  if (!vehicle) return { ok: false, error: "Vehicle not found" };

  const error = validateUpload(doc);
  if (error) return { ok: false, error };

  addVehicleDocument(vehicleId, {
    type: doc.type,
    expiryDate: doc.expiryDate,
    fileRef: `mock-upload://${vehicleId}/${doc.fileName}`,
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    dataUrl: doc.dataUrl,
    uploadedBy: actor,
  });

  recordAudit({
    entityType: "VEHICLE",
    entityId: vehicleId,
    action: `Document uploaded (${doc.type.replace(/_/g, " ")})`,
    actor,
    details: doc.fileName,
  });

  return { ok: true };
}
