import { uberEatsAdapter } from "./uber-eats";
import { deliverooAdapter } from "./deliveroo";
import type { PlatformAdapter } from "./platform-adapter";
import type { Platform } from "@/types";

export const adapters: Record<Platform, PlatformAdapter> = {
  UBER_EATS: uberEatsAdapter,
  DELIVEROO: deliverooAdapter,
};

export function getAdapter(platform: Platform): PlatformAdapter {
  return adapters[platform];
}

/** Poll every registered platform adapter for new orders. */
export async function pollAllPlatforms() {
  const results = await Promise.all(Object.values(adapters).map((a) => a.fetchOrders()));
  return results.flat();
}

export * from "./platform-adapter";
