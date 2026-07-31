import { notificationsApi, type AppNotification } from '@/api/notifications';
import { useAuth } from '@/contexts/auth-context';
import {
  connectNotificationsWs,
  disconnectNotificationsWs,
  subscribeNotifications,
} from '@/lib/notifications-ws';
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
  onLiveNotification: (handler: (n: AppNotification) => void) => () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

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
    const unsub = subscribeNotifications((n) => {
      setUnreadCount((c) => c + 1);
      setBanner(n);
    });
    return () => {
      unsub();
      disconnectNotificationsWs();
    };
  }, [initialized, session, refreshUnread]);

  const onLiveNotification = useCallback((handler: (n: AppNotification) => void) => {
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
