import type { AppNotification } from '@/api/notifications';
import { API_BASE_URL } from '@/api/client';
import { getSessionId } from '@/lib/auth-storage';

export type AchievementUnlockPayload = {
  notification: AppNotification;
  achievement: {
    id: string;
    title: string;
    description?: string | null;
    iconPath?: string | null;
  };
  reward?: {
    title: string;
    description?: string | null;
    iconPath?: string | null;
  } | null;
};

export type SubscriptionGrantedPayload = {
  tariffId: string;
  tariffTitle: string;
  periodEnd?: string | null;
  /** purchase | renewal | reward */
  source: string;
};

export type CertificateIssuedPayload = {
  number: number;
  numberLabel: string;
  fullName: string;
  filePath: string;
};

export type NotificationsWsEvent =
  | { type: 'notification'; data: AppNotification }
  | { type: 'achievement_unlocked'; data: AchievementUnlockPayload }
  | { type: 'subscription_granted'; data: SubscriptionGrantedPayload }
  | { type: 'certificate_issued'; data: CertificateIssuedPayload };

type Handler = (ev: NotificationsWsEvent) => void;

let socket: WebSocket | null = null;
let handlers = new Set<Handler>();
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let stopped = true;
let attempt = 0;

function wsBase(): string {
  return API_BASE_URL.replace(/^http/, 'ws');
}

function clearReconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function scheduleReconnect() {
  if (stopped) return;
  clearReconnect();
  const delay = Math.min(30_000, 1000 * 2 ** Math.min(attempt, 4));
  attempt += 1;
  reconnectTimer = setTimeout(() => {
    void connectNotificationsWs();
  }, delay);
}

export function subscribeNotifications(handler: Handler): () => void {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}

export function disconnectNotificationsWs() {
  stopped = true;
  clearReconnect();
  if (socket) {
    try {
      socket.close();
    } catch {
      // ignore
    }
    socket = null;
  }
}

export async function connectNotificationsWs() {
  stopped = false;
  clearReconnect();
  const sessionId = getSessionId();
  if (!sessionId) return;

  if (
    socket &&
    (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  const url = `${wsBase()}/api/v1/notifications/ws?session_id=${encodeURIComponent(sessionId)}`;
  const ws = new WebSocket(url);
  socket = ws;

  ws.onopen = () => {
    attempt = 0;
  };

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(String(ev.data)) as {
        type?: string;
        data?: unknown;
      };
      if (msg.type === 'notification' && msg.data) {
        const event: NotificationsWsEvent = {
          type: 'notification',
          data: msg.data as AppNotification,
        };
        handlers.forEach((h) => h(event));
      } else if (msg.type === 'achievement_unlocked' && msg.data) {
        const event: NotificationsWsEvent = {
          type: 'achievement_unlocked',
          data: msg.data as AchievementUnlockPayload,
        };
        handlers.forEach((h) => h(event));
      } else if (msg.type === 'subscription_granted' && msg.data) {
        const event: NotificationsWsEvent = {
          type: 'subscription_granted',
          data: msg.data as SubscriptionGrantedPayload,
        };
        handlers.forEach((h) => h(event));
      } else if (msg.type === 'certificate_issued' && msg.data) {
        const event: NotificationsWsEvent = {
          type: 'certificate_issued',
          data: msg.data as CertificateIssuedPayload,
        };
        handlers.forEach((h) => h(event));
      }
    } catch {
      // ignore bad frames
    }
  };

  ws.onclose = () => {
    if (socket === ws) socket = null;
    scheduleReconnect();
  };

  ws.onerror = () => {
    try {
      ws.close();
    } catch {
      // ignore
    }
  };
}
