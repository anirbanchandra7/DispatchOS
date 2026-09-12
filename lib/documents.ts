import type { DocumentStatus } from "@/types";

export const EXPIRING_SOON_DAYS = 30;

export function computeDocumentStatus(expiryDate?: string): DocumentStatus {
  if (!expiryDate) return "VALID";
  const days = (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (days < 0) return "EXPIRED";
  if (days <= EXPIRING_SOON_DAYS) return "EXPIRING_SOON";
  return "VALID";
}

export function documentStatusVariant(status: DocumentStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "VALID":
      return "secondary";
    case "EXPIRING_SOON":
      return "outline";
    case "EXPIRED":
      return "destructive";
  }
}
