import { Injectable, signal } from '@angular/core';
import { API_BASE, getSessionId } from '@/core/api/api-client';
import { apiCall } from '@/core/api/api-utils';
import {
  supportListThreads,
  supportMarkThreadRead,
  supportPostAdminMessage,
  supportSupportUnreadCount
} from '@/core/api/generated/sdk.gen';
import type { SupportMessageOut } from '@/core/api/generated/types.gen';

/** Обработчик живого сообщения из WS-хаба поддержки. */
export type SupportMessageHandler = (message: SupportMessageOut) => void;

/**
 * Реалтайм-слой поддержки: WS-соединение с /support/ws (паттерн мобильного клиента —
 * singleton-сокет, фреймы {type, data}, реконнект с бэкоффом) и глобальный счётчик
 * непрочитанных сообщений пользователей для бейджа в сайдбаре.
 */
@Injectable({ providedIn: 'root' })
export class SupportStoreService {
  private readonly _unreadCount = signal(0);
  readonly unreadCount = this._unreadCount.asReadonly();

  private readonly _handlers = new Set<SupportMessageHandler>();
  private _ws: WebSocket | null = null;
  private _attempt = 0;
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  /** Подписка на живые сообщения; заодно гарантирует открытие сокета. */
  subscribe(handler: SupportMessageHandler): () => void {
    this._handlers.add(handler);
    this.connect();
    return () => this._handlers.delete(handler);
  }

  /** Открывает сокет и загружает счётчик непрочитанных — вызывается из AdminLayout. */
  init(): void {
    this.connect();
    void this.refreshUnreadCount();
  }

  async refreshUnreadCount(): Promise<void> {
    try {
      const out = await apiCall(() => supportSupportUnreadCount());
      this._unreadCount.set(out.count);
    } catch {
      // бейдж просто останется с прежним значением
    }
  }

  async markThreadRead(threadId: string): Promise<void> {
    try {
      const out = await apiCall(() => supportMarkThreadRead({ path: { thread_id: threadId } }));
      this._unreadCount.set(out.count);
    } catch {
      // не критично: бейдж обновится при следующем WS-событии/обновлении
    }
  }

  async sendAdminMessage(threadId: string, body: string): Promise<SupportMessageOut> {
    const message = await apiCall(() =>
      supportPostAdminMessage({ path: { thread_id: threadId }, body: { body } })
    );
    // ответ админа отмечает тред прочитанным на сервере — синхронизируем бейдж
    void this.refreshUnreadCount();
    return message;
  }

  private connect(): void {
    if (this._ws && (this._ws.readyState === WebSocket.OPEN || this._ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    const sessionId = getSessionId();
    if (!sessionId) return;

    const url = `${API_BASE.replace(/^http/, 'ws')}/api/v1/support/ws?session_id=${encodeURIComponent(sessionId)}`;
    const ws = new WebSocket(url);
    this._ws = ws;

    ws.onopen = () => {
      this._attempt = 0;
    };
    ws.onmessage = (event) => {
      try {
        const frame = JSON.parse(event.data as string) as { type: string; data: SupportMessageOut };
        if (frame.type !== 'support_message' || !frame.data) return;
        if (frame.data.senderRole === 'user') {
          this._unreadCount.update((n) => n + 1);
        }
        this._handlers.forEach((handler) => handler(frame.data));
      } catch {
        // некорректный фрейм игнорируем
      }
    };
    ws.onclose = () => {
      const delay = Math.min(30_000, 1000 * 2 ** Math.min(this._attempt++, 4));
      this._reconnectTimer = setTimeout(() => this.connect(), delay);
    };
  }
}
