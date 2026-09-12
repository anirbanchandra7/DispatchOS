"use server";

import { ensureSeeded } from "@/lib/store/ensure-seeded";
import { listDrivers, getDriver, getOwnedVehicleByDriver, listOwnedVehicles, upsertDriverDocument } from "@/lib/store/repositories/drivers-repo";
import { getAuditForEntity } from "@/lib/audit/audit-log";
import { recordAudit } from "@/lib/audit/audit-log";
import { canManageDriverDocuments } from "@/lib/auth/permissions";
import type { DocumentType, UserRole } from "@/types";

export type DriverActionResult = { ok: true } | { ok: false; error: string };

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB per document

export interface DriverDocumentUploadInput {
  type: DocumentType;
  documentNumber: string;
  expiryDate?: string;
  fileName: string;
  mimeType: string;
  dataUrl: string;
}

export async function getDrivers() {
  ensureSeeded();
  return listDrivers();
}

export async function getOwnedVehicles() {
  ensureSeeded();
  return listOwnedVehicles();
}

export async function getDriverById(id: string) {
  ensureSeeded();
  const driver = getDriver(id);
  if (!driver) return null;
  const ownedVehicle = getOwnedVehicleByDriver(id);
  const audit = getAuditForEntity("DRIVER", id);
  return { driver, ownedVehicle, audit };
}

export async function uploadDriverDocumentAction(
  driverId: string,
  input: DriverDocumentUploadInput,
  role: UserRole,
  actor: string,
): Promise<DriverActionResult> {
  ensureSeeded();
  if (!canManageDriverDocuments(role)) return { ok: false, error: "You don't have permission to manage driver documents" };

  const driver = getDriver(driverId);
  if (!driver) return { ok: false, error: "Driver not found" };
  if (!input.fileName.trim()) return { ok: false, error: "A file is required" };
  const approxBytes = (input.dataUrl.length * 3) / 4;
  if (approxBytes > MAX_UPLOAD_BYTES) return { ok: false, error: "File is too large (max 5MB)" };

  const wasExisting = driver.documents.some((d) => d.type === input.type);
  upsertDriverDocument(driverId, {
    type: input.type,
    documentNumber: input.documentNumber.trim() || "N/A",
    expiryDate: input.expiryDate,
    fileRef: `mock-upload://${driverId}/${input.fileName}`,
    fileName: input.fileName,
    mimeType: input.mimeType,
    dataUrl: input.dataUrl,
    uploadedBy: actor,
  });

  recordAudit({
    entityType: "DRIVER",
    entityId: driverId,
    action: `${wasExisting ? "Document renewed" : "Document uploaded"} (${input.type.replace(/_/g, " ")})`,
    actor,
    details: input.fileName,
  });

  return { ok: true };
}
