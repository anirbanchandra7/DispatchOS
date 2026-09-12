"use server";

import { ensureSeeded } from "@/lib/store/ensure-seeded";
import { getNotifications, markAllRead, unreadCount } from "@/lib/notifications/notification-service";

export async function getNotificationsAction() {
  ensureSeeded();
  return { notifications: getNotifications(30), unread: unreadCount() };
}

export async function markAllNotificationsReadAction() {
  ensureSeeded();
  markAllRead();
  return { ok: true };
}
