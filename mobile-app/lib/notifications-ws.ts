import type { AppNotification } from '@/api/notifications';
import { API_BASE_URL } from '@/api/client';
import { getAccessToken } from '@/lib/auth-storage';

type Handler = (n: AppNotification) => void;

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
  const token = getAccessToken();
  if (!token) return;

  if (
    socket &&
    (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  const url = `${wsBase()}/api/v1/notifications/ws?token=${encodeURIComponent(token)}`;
  const ws = new WebSocket(url);
  socket = ws;

  ws.onopen = () => {
    attempt = 0;
  };

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(String(ev.data)) as {
        type?: string;
        data?: AppNotification;
      };
      if (msg.type === 'notification' && msg.data) {
        handlers.forEach((h) => h(msg.data!));
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
