import type { Order, OrderStatus, Platform } from "@/types";

/**
 * Common interface every delivery platform integration must implement.
 * Swapping a mock adapter for a real Uber Eats / Deliveroo client later
 * means implementing this interface against the real API and registering
 * it in `getAdapter()` below - no other application code changes.
 */
export interface PlatformAdapter {
  platform: Platform;
  /** Poll the platform for new orders since the last sync. */
  fetchOrders(): Promise<Order[]>;
  /** Fetch a single order by its external platform ID. */
  getOrder(externalOrderId: string): Promise<Order | null>;
  /** Acknowledge/accept an order on the platform side. */
  acceptOrder(externalOrderId: string): Promise<boolean>;
  /** Push a status update back to the platform. */
  updateOrderStatus(externalOrderId: string, status: OrderStatus): Promise<boolean>;
}
