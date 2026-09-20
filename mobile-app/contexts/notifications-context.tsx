import { notificationsApi, type AppNotification } from '@/api/notifications';
import { useAuth } from '@/contexts/auth-context';
import {
  connectNotificationsWs,
  disconnectNotificationsWs,
  subscribeNotifications,
  type NotificationsWsEvent,
  type SubscriptionGrantedPayload,
} from '@/lib/notifications-ws';
import { registerPushToken } from '@/lib/push-notifications';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

type NotificationsContextValue = {
  unreadCount: number;
  banner: AppNotification | null;
  dismissBanner: () => void;
  refreshUnread: () => void;
  onLiveNotification: (handler: (ev: NotificationsWsEvent) => void) => () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const SUBSCRIPTION_TITLES: Record<string, string> = {
  purchase: 'Подписка оформлена',
  renewal: 'Подписка продлена',
  reward: 'Подписка получена в награду',
};

function subscriptionBanner(d: SubscriptionGrantedPayload): AppNotification {
  const until = d.periodEnd ? ` — до ${new Date(d.periodEnd).toLocaleDateString('ru-RU')}` : '';
  return {
    id: `sub-${d.source}-${Date.now()}`,
    title: SUBSCRIPTION_TITLES[d.source] ?? 'Обновление подписки',
    body: `Тариф «${d.tariffTitle}»${until}`,
    createdAt: new Date().toISOString(),
    readAt: null,
    isRead: true,
  };
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { session, initialized } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [banner, setBanner] = useState<AppNotification | null>(null);

  const refreshUnread = useCallback(() => {
    if (!session) {
      setUnreadCount(0);
      return;
    }
    void notificationsApi
      .unreadCount()
      .then(setUnreadCount)
      .catch(() => setUnreadCount(0));
  }, [session]);

  const dismissBanner = useCallback(() => setBanner(null), []);

  useEffect(() => {
    if (!initialized) return;
    if (!session) {
      disconnectNotificationsWs();
      setUnreadCount(0);
      setBanner(null);
      return;
    }
    refreshUnread();
    void connectNotificationsWs();
    void registerPushToken();
    const unsub = subscribeNotifications((ev) => {
      if (ev.type === 'notification') {
        setUnreadCount((c) => c + 1);
        setBanner(ev.data);
        return;
      }
      if (ev.type === 'subscription_granted') {
        // Сервер не создаёт Notification — инбокс и счётчик не трогаем, только баннер
        setBanner(subscriptionBanner(ev.data));
        return;
      }
      // Achievement unlocks: count toward inbox, toast handled by AchievementsProvider.
      setUnreadCount((c) => c + 1);
    });
    return () => {
      unsub();
      disconnectNotificationsWs();
    };
  }, [initialized, session, refreshUnread]);

  const onLiveNotification = useCallback((handler: (ev: NotificationsWsEvent) => void) => {
    return subscribeNotifications(handler);
  }, []);

  const value = useMemo(
    () => ({
      unreadCount,
      banner,
      dismissBanner,
      refreshUnread,
      onLiveNotification,
    }),
    [unreadCount, banner, dismissBanner, refreshUnread, onLiveNotification],
  );

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return ctx;
}
