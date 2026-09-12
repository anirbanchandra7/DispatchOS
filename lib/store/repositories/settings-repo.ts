import { store } from "@/lib/store/data-store";
import type { AppSettings } from "@/types";

export function getAppSettings(): AppSettings {
  return store.settings;
}

export function updateAppSettings(patch: Partial<AppSettings>): AppSettings {
  store.settings = { ...store.settings, ...patch, updatedAt: new Date().toISOString() };
  return store.settings;
}
