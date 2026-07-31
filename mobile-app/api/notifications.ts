/** Notifications API facade over generated OpenAPI client. */
import {
  notificationsListNotifications,
  notificationsMarkAllRead,
  notificationsMarkRead,
  notificationsUnreadCount,
} from '@/api/generated/sdk.gen';
import type { NotificationOut, UnreadCountOut } from '@/api/generated/types.gen';
import { apiCall } from '@/api/utils';

export type AppNotification = NotificationOut;

export const notificationsApi = {
  list: (unreadOnly = false): Promise<AppNotification[]> =>
    apiCall(() =>
      notificationsListNotifications({
        query: unreadOnly ? { unreadOnly: true } : {},
      }),
    ),

  unreadCount: (): Promise<number> =>
    apiCall(() => notificationsUnreadCount()).then(
      (x: UnreadCountOut) => x.count,
    ),

  markRead: (id: string): Promise<AppNotification> =>
    apiCall(() =>
      notificationsMarkRead({ path: { notification_id: id } }),
    ),

  markAllRead: (): Promise<void> =>
    apiCall(() => notificationsMarkAllRead()).then(() => undefined),
};
