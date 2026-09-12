import { store } from "@/lib/store/data-store";
import { newId } from "@/lib/id";
import type { AuditEntry } from "@/types";

export function recordAudit(entry: Omit<AuditEntry, "id" | "timestamp">): AuditEntry {
  const full: AuditEntry = { ...entry, id: newId(), timestamp: new Date().toISOString() };
  store.auditLog.unshift(full);
  return full;
}

export function getAuditForEntity(entityType: AuditEntry["entityType"], entityId: string): AuditEntry[] {
  return store.auditLog.filter((a) => a.entityType === entityType && a.entityId === entityId);
}

export function getRecentAudit(limit = 50): AuditEntry[] {
  return store.auditLog.slice(0, limit);
}
