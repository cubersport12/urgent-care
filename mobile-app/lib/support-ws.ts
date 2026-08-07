import type { SupportMessage } from '@/api/support';
import { API_BASE_URL } from '@/api/client';
import { getAccessToken } from '@/lib/auth-storage';

type Handler = (m: SupportMessage) => void;

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
    void connectSupportWs();
  }, delay);
}

export function subscribeSupport(handler: Handler): () => void {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}

export function disconnectSupportWs() {
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

export async function connectSupportWs() {
  stopped = false;
  clearReconnect();
  const token = getAccessToken();
  if (!token) return;

  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  try {
    const ws = new WebSocket(`${wsBase()}/api/v1/support/ws?token=${encodeURIComponent(token)}`);
    socket = ws;
    ws.onopen = () => {
      attempt = 0;
    };
    ws.onmessage = (ev) => {
      try {
        const payload = JSON.parse(String(ev.data)) as {
          type?: string;
          data?: SupportMessage;
        };
        if (payload.type === 'support_message' && payload.data) {
          for (const h of handlers) h(payload.data);
        }
      } catch {
        // ignore
      }
    };
    ws.onclose = () => {
      socket = null;
      scheduleReconnect();
    };
    ws.onerror = () => {
      try {
        ws.close();
      } catch {
        // ignore
      }
    };
  } catch {
    scheduleReconnect();
  }
}
