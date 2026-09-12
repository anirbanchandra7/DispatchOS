"use server";

import { ensureSeeded } from "@/lib/store/ensure-seeded";
import { getAppSettings, updateAppSettings } from "@/lib/store/repositories/settings-repo";
import { recordAudit } from "@/lib/audit/audit-log";

const SETTINGS_ENTITY_ID = "app-settings";

export async function getSettings() {
  ensureSeeded();
  return getAppSettings();
}

export async function setAutoAccept(enabled: boolean, actor: string) {
  ensureSeeded();
  const settings = updateAppSettings({ autoAcceptEnabled: enabled, updatedBy: actor });
  recordAudit({
    entityType: "SETTINGS",
    entityId: SETTINGS_ENTITY_ID,
    action: enabled ? "Auto-accept enabled" : "Auto-accept disabled",
    actor,
  });
  return settings;
}
