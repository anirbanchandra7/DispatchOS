import { store } from "@/lib/store/data-store";
import { newId } from "@/lib/id";
import type { AppNotification, NotificationType } from "@/types";

// Notification "channels" — today only the in-app channel is implemented.
// To add email/WhatsApp/push later, implement the same NotificationSender
// interface and register it in `senders` below; notify() will fan out to all.
interface NotificationSender {
  send(notification: AppNotification): void;
}

const inAppSender: NotificationSender = {
  send() {
    // In-app notifications are read directly from the store by the UI;
    // nothing else to do here. Kept as an explicit sender for symmetry
    // with future channels (email/WhatsApp/push).
  },
};

const senders: NotificationSender[] = [inAppSender];

export function notify(
  type: NotificationType,
  title: string,
  message: string,
  refs: { orderId?: string; driverId?: string; vehicleId?: string } = {},
): AppNotification {
  const notification: AppNotification = {
    id: newId(),
    type,
    title,
    message,
    createdAt: new Date().toISOString(),
    read: false,
    relatedOrderId: refs.orderId,
    relatedDriverId: refs.driverId,
    relatedVehicleId: refs.vehicleId,
  };
  store.notifications.unshift(notification);
  senders.forEach((s) => s.send(notification));
  return notification;
}

export function getNotifications(limit = 30): AppNotification[] {
  return store.notifications.slice(0, limit);
}

export function markAllRead() {
  store.notifications.forEach((n) => (n.read = true));
}

export function markRead(id: string) {
  const n = store.notifications.find((x) => x.id === id);
  if (n) n.read = true;
}

export function unreadCount(): number {
  return store.notifications.filter((n) => !n.read).length;
}
