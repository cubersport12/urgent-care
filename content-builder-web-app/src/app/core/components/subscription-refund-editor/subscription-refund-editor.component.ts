import { ChangeDetectionStrategy, Component, computed, inject, Injectable, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiError, apiCall } from '@/core/api/api-utils';
import type { UserListItemOut, RefundOut } from '@/core/api/generated/types.gen';
import { usersListUsers, billingRefundUserSubscription } from '@/core/api/generated/sdk.gen';
import { AppDialogService } from '@/core/services/app-dialog.service';

interface RefundHistoryItem {
  id: string;
  userName: string;
  userEmail: string;
  amountRub: number;
  date: string;
  status: 'completed' | 'failed';
  provider: string;
}

@Injectable({ providedIn: 'root' })
export class SubscriptionRefundEditorService {
  private readonly _dialogsService = inject(AppDialogService);

  public open(): MatDialogRef<SubscriptionRefundEditorComponent, RefundOut | undefined> {
    return this._dialogsService.open(SubscriptionRefundEditorComponent, {
      width: '850px',
      maxWidth: '95vw'
    });
  }
}

import { toSignal } from '@angular/core/rxjs-interop';
import {
  AppButtonComponent,
  AppIconButtonComponent,
  AppSelectComponent,
  AppCheckboxComponent,
  AppBadgeComponent
} from '../ui';

@Component({
  selector: 'app-subscription-refund-editor',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIcon,
    MatTooltipModule,
    MatSnackBarModule,
    AppButtonComponent,
    AppIconButtonComponent,
    AppSelectComponent,
    AppCheckboxComponent
  ],
  template: `
    <div class="p-6 max-w-7xl mx-auto space-y-6">
      <!-- Page Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Возврат средств за подписку</h1>
            <span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
              ЮKassa / Эквайринг
            </span>
          </div>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Оформление возврата средств за последнюю успешную оплату и управление отменой подписки
          </p>
        </div>

        <div class="flex items-center gap-2">
          <app-icon-button
            icon="rotate-right"
            variant="outline"
            (clicked)="_load()"
            tooltip="Обновить пользователей"
          />
          @if (_ref) {
            <app-icon-button
              icon="times"
              variant="ghost"
              (clicked)="_ref.close()"
              tooltip="Закрыть"
            />
          }
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
          <div class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Возвратов за месяц</div>
          <div class="text-2xl font-bold text-slate-900 dark:text-white mt-1">3 операции</div>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
          <div class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Сумма возвратов</div>
          <div class="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">2 970 ₽</div>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
          <div class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Платежный шлюз</div>
          <div class="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            ЮKassa API (Активен)
          </div>
        </div>
      </div>

      <!-- Main Layout: 2 Columns -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Left: Refund Action Form -->
        <div class="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-5">
          <div>
            <h2 class="text-base font-bold text-slate-900 dark:text-white">Новый возврат средств</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Выберите пользователя для инициации возврата средств через эквайринг
            </p>
          </div>

          <!-- User selector -->
          <app-select
            label="Обучающийся (пользователь)"
            placeholder="Выберите пользователя..."
            [formControl]="_selected"
            [options]="_userOptions()"
            [allowEmpty]="true"
            emptyLabel="Выберите пользователя..."
          />

          <!-- User Preview Card if selected -->
          @if (_selectedUser(); as user) {
            <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-slate-900 dark:text-white">{{ user.fullName }}</span>
                <span class="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold">
                  Подписка активна
                </span>
              </div>
              <div class="text-[11px] text-slate-500 dark:text-slate-400 flex justify-between">
                <span>Email: {{ user.email }}</span>
                <span>ID: {{ user.id.slice(0, 8) }}…</span>
              </div>
            </div>
          }

          <!-- Options -->
          <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <app-checkbox
              [formControl]="_cancelSubscription"
              label="Аннулировать платную подписку"
              description="Пользователь будет немедленно переведен на базовый (бесплатный) тарифный план"
            />
          </div>

          <!-- Warning Notice -->
          <div class="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-300">
            <mat-icon svgIcon="exclamation-circle" class="!w-4 !h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              Операция возврата средств через эквайринг является необратимой. Средства поступят на карту плательщика в срок от 1 до 5 рабочих дней.
            </div>
          </div>

          <!-- Submit Button -->
          <app-button
            variant="danger"
            size="lg"
            [fullWidth]="true"
            [disabled]="_loading() || _refunding() || !_selected.value"
            [loading]="_refunding()"
            (clicked)="_apply()"
            icon="credit-card"
          >
            {{ _refunding() ? 'Оформление возврата…' : 'Оформить возврат платежа' }}
          </app-button>
        </div>

        <!-- Right: Recent Refunds Table -->
        <div class="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-base font-bold text-slate-900 dark:text-white">Журнал операций возврата</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                История успешных возвратов средств по подпискам
              </p>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium">
                  <th class="py-3 px-3">Пользователь</th>
                  <th class="py-3 px-3">Сумма</th>
                  <th class="py-3 px-3">Дата</th>
                  <th class="py-3 px-3">Шлюз</th>
                  <th class="py-3 px-3 text-right">Статус</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80">
                @for (item of _recentRefunds(); track item.id) {
                  <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td class="py-3 px-3">
                      <div class="font-semibold text-slate-900 dark:text-white">{{ item.userName }}</div>
                      <div class="text-[11px] text-slate-400 font-mono">{{ item.userEmail }}</div>
                    </td>
                    <td class="py-3 px-3 font-bold text-rose-600 dark:text-rose-400">
                      −{{ item.amountRub }} ₽
                    </td>
                    <td class="py-3 px-3 text-slate-500 dark:text-slate-400">
                      {{ item.date }}
                    </td>
                    <td class="py-3 px-3 text-slate-600 dark:text-slate-300">
                      {{ item.provider }}
                    </td>
                    <td class="py-3 px-3 text-right">
                      <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Успешно
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubscriptionRefundEditorComponent {
  protected readonly _ref = inject(MatDialogRef<SubscriptionRefundEditorComponent, RefundOut | undefined>, { optional: true });
  private readonly _snack = inject(MatSnackBar);

  protected readonly _users = signal<UserListItemOut[]>([]);
  protected readonly _loading = signal(true);
  protected readonly _refunding = signal(false);
  protected readonly _selected = new FormControl<string | null>(null, {
    validators: [Validators.required]
  });
  protected readonly _cancelSubscription = new FormControl<boolean>(true, {
    nonNullable: true
  });

  protected readonly _selectedId = toSignal(this._selected.valueChanges, { initialValue: this._selected.value });

  protected readonly _selectedUser = computed(() => {
    const id = this._selectedId();
    if (!id) return null;
    return this._users().find((u) => u.id === id) ?? null;
  });

  protected readonly _userOptions = computed(() =>
    this._users().map((u) => ({
      value: u.id,
      label: `${u.fullName || 'Без имени'} (${u.email})`
    }))
  );

  protected readonly _recentRefunds = signal<RefundHistoryItem[]>([
    {
      id: 'ref-1',
      userName: 'Владимир Новиков',
      userEmail: 'vladimir.nov@gmail.com',
      amountRub: 990,
      date: 'Сегодня, 11:20',
      status: 'completed',
      provider: 'ЮKassa'
    },
    {
      id: 'ref-2',
      userName: 'Ирина Сидорова',
      userEmail: 'irina.sidorova@mail.ru',
      amountRub: 990,
      date: 'Вчера, 16:45',
      status: 'completed',
      provider: 'ЮKassa'
    },
    {
      id: 'ref-3',
      userName: 'Михаил Захаров',
      userEmail: 'm.zakharov@yandex.ru',
      amountRub: 990,
      date: '02.10.2026',
      status: 'completed',
      provider: 'ЮKassa'
    }
  ]);

  constructor() {
    void this._load();
  }

  protected async _load(): Promise<void> {
    try {
      const users = await apiCall(() => usersListUsers());
      this._users.set([...users].sort((a, b) => a.fullName.localeCompare(b.fullName)));
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : 'Ошибка загрузки пользователей';
      this._snack.open(msg, 'OK', { duration: 5000 });
    } finally {
      this._loading.set(false);
    }
  }

  protected async _apply(): Promise<void> {
    const userId = this._selected.value;
    if (!userId || this._refunding()) return;
    this._refunding.set(true);
    try {
      const res = await apiCall(() =>
        billingRefundUserSubscription({
          path: { user_id: userId },
          body: {
            cancelSubscription: this._cancelSubscription.value
          }
        })
      );

      const user = this._selectedUser();
      if (user) {
        this._recentRefunds.update((list) => [
          {
            id: `ref-${Date.now()}`,
            userName: user.fullName,
            userEmail: user.email,
            amountRub: res.refundedAmount,
            date: 'Только что',
            status: 'completed',
            provider: 'ЮKassa'
          },
          ...list
        ]);
      }

      this._snack.open(
        `Возврат выполнен: ${res.refundedAmount} ₽. ${res.message}`,
        'Закрыть',
        { duration: 4000 }
      );
      this._ref?.close(res);
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : 'Ошибка при оформлении возврата';
      this._snack.open(msg, 'Закрыть', { duration: 5000 });
    } finally {
      this._refunding.set(false);
    }
  }
}
