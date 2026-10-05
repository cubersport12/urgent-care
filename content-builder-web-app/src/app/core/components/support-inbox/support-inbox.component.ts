import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, inject, signal, viewChild } from '@angular/core';import { FormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { supportCreateThreadForUser, supportGetThread, supportListThreads, usersListUsers } from '@/core/api/generated/sdk.gen';
import type { SupportMessageOut, SupportThreadOut } from '@/core/api/generated/types.gen';
import { apiCall, ApiError } from '@/core/api/api-utils';
import { SupportStoreService } from '@/core/services/support-store.service';
import { AppDialogService } from '@/core/services/app-dialog.service';
import { AppDialogWrapperComponent } from '../dialog-wrapper/dialog-wrapper.component';
import { AppBadgeComponent, AppButtonComponent, AppIconButtonComponent, AppSelectComponent, AppSelectOption } from '../ui';

@Component({
  selector: 'app-support-new-dialog',
  imports: [FormsModule, AppSelectComponent, AppDialogWrapperComponent],
  template: `
    <app-dialog-wrapper
      title="Новый диалог"
      subtitle="Выберите пользователя, чтобы начать или продолжить переписку"
      saveText="Открыть чат"
      saveIcon="comments"
      [saveDisabled]="!_userId"
      (save)="_save()"
      (close)="_ref.close()"
    >
      <div class="min-w-[320px] max-w-full">
        <app-select
          label="Пользователь"
          icon="user"
          placeholder="Выберите пользователя…"
          [options]="_options()"
          [(ngModel)]="_userId"
          [allowEmpty]="true"
          emptyLabel="Выберите пользователя…"
        />
      </div>
    </app-dialog-wrapper>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SupportNewDialogComponent {
  protected readonly _ref = inject(MatDialogRef<SupportNewDialogComponent, string | null>);
  protected _userId: string | null = null;
  protected readonly _options = signal<AppSelectOption[]>([]);

  constructor() {
    void (async () => {
      try {
        const users = await apiCall(() => usersListUsers());
        this._options.set(
          [...users]
            .sort((a, b) => (a.fullName || a.email).localeCompare(b.fullName || b.email, 'ru'))
            .map((u) => ({ value: u.id, label: `${u.fullName || 'Без имени'} (${u.email})` }))
        );
      } catch {
        // пустой список — открытие чата невозможно
      }
    })();
  }

  protected _save(): void {
    if (!this._userId) return;
    this._ref.close(this._userId);
  }
}

@Component({
  selector: 'app-support-inbox',
  imports: [FormsModule, MatIcon, MatSnackBarModule, AppButtonComponent, AppBadgeComponent, AppIconButtonComponent],
  template: `
    <div class="p-6 max-w-7xl mx-auto flex flex-col h-full">
      <!-- Page Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm mb-4">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Служба поддержки</h1>
            @if (_store.unreadCount() > 0) {
              <span class="px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-500 text-white">
                {{ _store.unreadCount() }}
              </span>
            }
          </div>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Чаты с пользователями; новые сообщения приходят мгновенно
          </p>
        </div>
        <div class="flex items-center gap-2">
          <app-icon-button
            icon="edit"
            variant="primary"
            tooltip="Новый диалог с пользователем"
            (clicked)="_newDialog()"
          />
          <app-icon-button
            icon="rotate-right"
            variant="outline"
            tooltip="Обновить список диалогов"
            (clicked)="_loadThreads()"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-260px)] min-h-0">
        <!-- Threads list -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col min-h-0 overflow-hidden">
          <div class="px-4 py-3 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0">
            Диалоги ({{ _threads().length }})
          </div>
          <div class="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
            @for (t of _threads(); track t.id) {
              <button
                type="button"
                class="w-full text-left p-4 flex gap-3 items-start transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                [class.bg-blue-50]="t.id === _selectedId()"
                [class.dark:bg-blue-950/30]="t.id === _selectedId()"
                (click)="_selectThread(t)"
              >
                <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                  {{ _initials(t.userFullName, t.userEmail) }}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-semibold text-slate-900 dark:text-white text-xs truncate">
                      {{ t.userFullName || t.userEmail || 'Без имени' }}
                    </span>
                    <span class="text-[10px] text-slate-400 shrink-0">{{ _fmtListDate(t.lastMessageAt) }}</span>
                  </div>
                  <div class="text-[11px] text-slate-400 font-mono truncate">{{ t.userEmail }}</div>
                  <div class="flex items-center justify-between gap-2 mt-1">
                    <span class="text-[11px] truncate" [class.text-slate-500]="!t.unreadCount" [class.dark:text-slate-400]="!t.unreadCount" [class.font-semibold]="!!t.unreadCount" [class.text-slate-900]="!!t.unreadCount" [class.dark:text-white]="!!t.unreadCount">
                      {{ t.lastBody || 'Нет сообщений' }}
                    </span>
                    @if (t.unreadCount > 0) {
                      <span class="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {{ t.unreadCount }}
                      </span>
                    }
                  </div>
                </div>
              </button>
            } @empty {
              <div class="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
                Обращений пока нет
              </div>
            }
          </div>
        </div>

        <!-- Chat pane -->
        <div class="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col min-h-0 overflow-hidden">
          @if (_selected(); as t) {
            <div class="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 shrink-0">
              <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                {{ _initials(t.userFullName, t.userEmail) }}
              </div>
              <div class="min-w-0">
                <p class="text-sm font-semibold text-slate-900 dark:text-white truncate">{{ t.userFullName || t.userEmail || 'Без имени' }}</p>
                <p class="text-[11px] text-slate-400 font-mono truncate">{{ t.userEmail }}</p>
              </div>
            </div>

            <div #msgScroll class="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50/60 dark:bg-slate-950/40">
              @for (m of _messages(); track m.id) {
                <div class="flex" [class.justify-end]="m.senderRole === 'admin'">
                  <div
                    class="max-w-[75%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-xs"
                    [class.bg-white]="m.senderRole !== 'admin'"
                    [class.dark:bg-slate-800]="m.senderRole !== 'admin'"
                    [class.border]="m.senderRole !== 'admin'"
                    [class.border-slate-200]="m.senderRole !== 'admin'"
                    [class.dark:border-slate-700]="m.senderRole !== 'admin'"
                    [class.rounded-bl-md]="m.senderRole !== 'admin'"
                    [class.bg-blue-600]="m.senderRole === 'admin'"
                    [class.text-white]="m.senderRole === 'admin'"
                    [class.rounded-br-md]="m.senderRole === 'admin'"
                  >
                    <p class="whitespace-pre-wrap break-words">{{ m.body }}</p>
                    <p class="text-[10px] mt-1 text-right" [class.text-slate-400]="m.senderRole !== 'admin'" [class.text-blue-200]="m.senderRole === 'admin'">
                      {{ _fmtTime(m.createdAt) }}
                    </p>
                  </div>
                </div>
              } @empty {
                @if (!_threadLoading()) {
                  <div class="h-full flex items-center justify-center text-xs text-slate-400 dark:text-slate-500">
                    Сообщений ещё нет — напишите первым
                  </div>
                }
              }
              @if (_threadLoading()) {
                <mat-icon svgIcon="spinner" class="!w-5 !h-5 animate-spin text-blue-600 mx-auto" />
              }
            </div>

            <div class="border-t border-slate-100 dark:border-slate-800 p-3 flex items-end gap-2 shrink-0">
              <textarea
                [ngModel]="_draft"
                (ngModelChange)="_draft = $event"
                (keydown.enter)="_onEnter($event)"
                rows="2"
                placeholder="Введите ответ… (Enter — отправить, Shift+Enter — новая строка)"
                class="flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              ></textarea>
              <app-button variant="primary" icon="paper-plane" [disabled]="!_draft.trim() || _sending()" [loading]="_sending()" (clicked)="_send()">
                Отправить
              </app-button>
            </div>
          } @else {
            <div class="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
              <mat-icon svgIcon="comments" class="!w-10 !h-10 text-slate-300 dark:text-slate-600" />
              <p class="text-sm font-medium text-slate-500 dark:text-slate-400">
                {{ _threads().length === 0 ? 'Обращений пока нет' : 'Выберите диалог слева' }}
              </p>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SupportInboxComponent {
  protected readonly _store = inject(SupportStoreService);
  private readonly _snack = inject(MatSnackBar);
  private readonly _dialogsService = inject(AppDialogService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _msgScroll = viewChild<ElementRef<HTMLDivElement>>('msgScroll');

  protected readonly _threads = signal<SupportThreadOut[]>([]);
  protected readonly _loading = signal(true);
  protected readonly _selectedId = signal<string | null>(null);
  protected readonly _messages = signal<SupportMessageOut[]>([]);
  protected readonly _threadLoading = signal(false);
  protected readonly _sending = signal(false);
  protected _draft = '';

  protected readonly _selected = computed(
    () => this._threads().find((t) => t.id === this._selectedId()) ?? null
  );

  private readonly _unsubscribe: () => void;

  constructor() {
    void this._loadThreads();
    this._unsubscribe = this._store.subscribe((message) => this._onLiveMessage(message));
    this._destroyRef.onDestroy(() => this._unsubscribe());
  }

  protected _initials(name: string | null | undefined, email: string | null | undefined): string {
    const source = (name || email || 'TD').trim();
    const parts = source.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return source.slice(0, 2).toUpperCase();
  }

  protected _fmtTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }

  protected _fmtListDate(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) {
      return this._fmtTime(iso);
    }
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  }

  protected _newDialog(): void {
    this._dialogsService
      .open(SupportNewDialogComponent, { width: '480px' })
      .afterClosed()
      .subscribe(async (userId: string | null | undefined) => {
        if (!userId) return;
        const existing = this._threads().find((t) => t.userId === userId);
        if (existing) {
          await this._selectThread(existing);
          return;
        }
        try {
          const detail = await apiCall(() => supportCreateThreadForUser({ body: { userId } }));
          const row: SupportThreadOut = {
            id: detail.id,
            userId: detail.userId,
            userEmail: detail.userEmail,
            userFullName: detail.userFullName,
            lastMessageAt: null,
            updatedAt: new Date().toISOString(),
            lastBody: null,
            unreadCount: 0
          };
          this._threads.update((list) => [row, ...list.filter((t) => t.id !== row.id)]);
          await this._selectThread(row);
        } catch (err) {
          this._snack.open(
            err instanceof ApiError ? err.detail : 'Не удалось открыть диалог',
            'Закрыть',
            { duration: 5000 }
          );
        }
      });
  }

  protected async _loadThreads(): Promise<void> {
    this._loading.set(true);
    try {
      const threads = await apiCall(() => supportListThreads());
      this._threads.set(threads ?? []);
    } catch (err) {
      this._snack.open(
        err instanceof ApiError ? err.detail : 'Не удалось загрузить диалоги',
        'Закрыть',
        { duration: 5000 }
      );
    } finally {
      this._loading.set(false);
    }
  }

  protected async _selectThread(thread: SupportThreadOut): Promise<void> {
    if (this._selectedId() === thread.id) return;
    this._selectedId.set(thread.id);
    this._messages.set([]);
    this._threadLoading.set(true);
    try {
      const detail = await apiCall(() => supportGetThread({ path: { thread_id: thread.id } }));
      // пользователь мог сменить тред, пока грузился этот
      if (this._selectedId() !== thread.id) return;
      this._messages.set(detail.messages ?? []);
      this._scrollToBottom();
    } catch (err) {
      this._snack.open(
        err instanceof ApiError ? err.detail : 'Не удалось загрузить переписку',
        'Закрыть',
        { duration: 5000 }
      );
    } finally {
      if (this._selectedId() === thread.id) {
        this._threadLoading.set(false);
      }
    }
    await this._store.markThreadRead(thread.id);
    this._threads.update((list) =>
      list.map((t) => (t.id === thread.id ? { ...t, unreadCount: 0 } : t))
    );
  }

  protected _onEnter(event: Event): void {
    const keyEvent = event as KeyboardEvent;
    if (keyEvent.shiftKey) return;
    keyEvent.preventDefault();
    void this._send();
  }

  protected async _send(): Promise<void> {
    const threadId = this._selectedId();
    const body = this._draft.trim();
    if (!threadId || !body || this._sending()) return;
    this._sending.set(true);
    try {
      const message = await this._store.sendAdminMessage(threadId, body);
      this._draft = '';
      this._appendMessage(message);
      this._updateThreadRow(threadId, message);
      this._scrollToBottom();
    } catch (err) {
      this._snack.open(
        err instanceof ApiError ? err.detail : 'Не удалось отправить сообщение',
        'Закрыть',
        { duration: 5000 }
      );
    } finally {
      this._sending.set(false);
    }
  }

  private _onLiveMessage(message: SupportMessageOut): void {
    const isCurrent = message.threadId === this._selectedId();
    if (isCurrent) {
      this._appendMessage(message);
      this._scrollToBottom();
      if (message.senderRole === 'user') {
        void this._store.markThreadRead(message.threadId);
      }
      this._updateThreadRow(message.threadId, message);
      return;
    }
    if (this._threads().some((t) => t.id === message.threadId)) {
      this._updateThreadRow(message.threadId, message);
    } else {
      // новое обращение от пользователя — перезагружаем список
      void this._loadThreads();
    }
  }

  private _appendMessage(message: SupportMessageOut): void {
    this._messages.update((list) =>
      list.some((m) => m.id === message.id) ? list : [...list, message]
    );
  }

  private _updateThreadRow(threadId: string, message: SupportMessageOut): void {
    this._threads.update((list) => {
      const updated = list.find((t) => t.id === threadId);
      if (!updated) {
        void this._loadThreads();
        return list;
      }
      const next: SupportThreadOut = {
        ...updated,
        lastBody: message.body,
        lastMessageAt: message.createdAt,
        unreadCount:
          message.senderRole === 'user' && threadId !== this._selectedId()
            ? updated.unreadCount + 1
            : updated.unreadCount
      };
      return [next, ...list.filter((t) => t.id !== threadId)];
    });
  }

  private _scrollToBottom(): void {
    setTimeout(() => {
      const el = this._msgScroll()?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }
}
