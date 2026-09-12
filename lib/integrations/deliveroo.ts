import type { PlatformAdapter } from "./platform-adapter";
import { generateMockOrder } from "./mock-order-factory";
import type { Order, OrderStatus } from "@/types";

/**
 * MOCK Deliveroo integration.
 *
 * To replace with the real Deliveroo API: implement this same
 * PlatformAdapter interface against Deliveroo's Order Webhook API
 * (https://api-docs.deliveroo.com/), keep the export name/shape
 * identical, and swap it in lib/integrations/index.ts.
 */
export const deliverooAdapter: PlatformAdapter = {
  platform: "DELIVEROO",

  async fetchOrders(): Promise<Order[]> {
    const shouldEmit = Math.random() < 0.5;
    return shouldEmit ? [generateMockOrder("DELIVEROO")] : [];
  },

  async getOrder(): Promise<Order | null> {
    return null;
  },

  async acceptOrder(): Promise<boolean> {
    return true;
  },

  async updateOrderStatus(_externalOrderId: string, _status: OrderStatus): Promise<boolean> {
    return true;
  },
};
