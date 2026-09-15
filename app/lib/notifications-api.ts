import { api, getApiErrorMessage } from "./api";
import { currentSessionUser } from "./current-user";

export type NotificationType =
  | "booking"
  | "invoice"
  | "payment"
  | "credit_note"
  | "refund"
  | "withdrawal"
  | "purchase"
  | "expense"
  | "transaction";

export type PmsNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  reference: string;
  href: string;
  timestamp: string;
  read: boolean;
};

type NotificationListResponse = {
  notifications: PmsNotification[];
  unread_count: number;
};

const userHeaders = {
  "x-user-id": currentSessionUser.email,
  "x-user-name": currentSessionUser.name,
  "x-user-email": currentSessionUser.email
};

export async function listNotifications(propertyId: string, limit = 30) {
  const response = await api.get<NotificationListResponse>("/notifications", {
    params: { property_id: propertyId, limit },
    headers: userHeaders
  });
  return response.data;
}

export async function markNotificationRead(propertyId: string, notificationId: string) {
  await api.patch(
    `/notifications/${encodeURIComponent(notificationId)}/read`,
    { property_id: propertyId },
    { headers: userHeaders }
  );
}

export async function markAllNotificationsRead(propertyId: string) {
  await api.post(
    "/notifications/read-all",
    { property_id: propertyId },
    { headers: userHeaders }
  );
}

export function getNotificationsApiErrorMessage(error: unknown) {
  return getApiErrorMessage(error, "Notifications could not be loaded.");
}
