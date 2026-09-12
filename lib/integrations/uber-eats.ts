import type { PlatformAdapter } from "./platform-adapter";
import { generateMockOrder } from "./mock-order-factory";
import type { Order, OrderStatus } from "@/types";

/**
 * MOCK Uber Eats integration.
 *
 * To replace with the real Uber Eats API: implement this same
 * PlatformAdapter interface using Uber's Order API / webhooks
 * (https://developer.uber.com/docs/eats), keep the export name/shape
 * identical, and swap it in lib/integrations/index.ts. No other part of
 * the app depends on mock-specific behaviour.
 */
export const uberEatsAdapter: PlatformAdapter = {
  platform: "UBER_EATS",

  async fetchOrders(): Promise<Order[]> {
    // Simulate occasional new inbound orders on each poll.
    const shouldEmit = Math.random() < 0.5;
    return shouldEmit ? [generateMockOrder("UBER_EATS")] : [];
  },

  async getOrder(): Promise<Order | null> {
    return null; // orders are looked up locally once ingested via fetchOrders()
  },

  async acceptOrder(): Promise<boolean> {
    return true;
  },

  async updateOrderStatus(_externalOrderId: string, _status: OrderStatus): Promise<boolean> {
    return true;
  },
};
