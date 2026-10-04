import { ChangeDetectionStrategy, Component, computed, inject, Injectable, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiError, apiCall } from '@/core/api/api-utils';
import type { UserListItemOut } from '@/core/api/generated/types.gen';
import { usersListUsers, usersResetUsersStats } from '@/core/api/generated/sdk.gen';
import { AppDialogService } from '@/core/services/app-dialog.service';

@Injectable({ providedIn: 'root' })
export class StatsResetEditorService {
  private readonly _dialogsService = inject(AppDialogService);

  public open(): MatDialogRef<StatsResetEditorComponent, number> {
    return this._dialogsService.open(StatsResetEditorComponent, {
      width: '850px',
      maxWidth: '95vw'
    });
  }
}

import {
  AppButtonComponent,
  AppIconButtonComponent,
  AppInputComponent,
  AppCheckboxComponent,
  AppBadgeComponent
} from '../ui';

@Component({
  selector: 'app-stats-reset-editor',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIcon,
    MatTooltipModule,
    MatSnackBarModule,
    AppButtonComponent,
    AppIconButtonComponent,
    AppInputComponent,
    AppCheckboxComponent,
    AppBadgeComponent
  ],
  template: `
    <div class="p-6 max-w-7xl mx-auto space-y-6">
      <!-- Page Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Сброс статистики обучающихся</h1>
            <span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
              Необратимая операция
            </span>
          </div>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Выборочное или групповое обнуление прогресса, результатов тестов, баллов XP и полученных достижений
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

      <!-- Caution Warning Banner -->
      <div class="flex items-start gap-3.5 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 shadow-xs">
        <div class="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
          <mat-icon svgIcon="trash" class="!w-4 !h-4" />
        </div>
        <div class="text-xs text-rose-900 dark:text-rose-200 space-y-1">
          <h2 class="font-bold text-sm">Внимание: сброс удаляет прогресс навсегда</h2>
          <p class="leading-relaxed text-rose-800 dark:text-rose-300">
            После подтверждения все попытки прохождения тестов, результаты клинических сценариев спасения и разблокированные достижения будут аннулированы. Учетная запись и тарифный план пользователя сохранятся.
          </p>
        </div>
      </div>

      <!-- Action Toolbar & Search -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
        <app-input
          [(ngModel)]="_searchQuery"
          placeholder="Поиск пользователей по имени или email..."
          icon="magnifying-glass"
          size="sm"
          class="flex-1 max-w-md"
        />

        <div class="flex items-center gap-2">
          <app-button
            variant="outline"
            size="sm"
            (clicked)="_toggleSelectAll()"
          >
            {{ _isAllSelected() ? 'Снять выделение' : 'Выбрать всех' }}
          </app-button>

          <app-button
            variant="danger"
            size="sm"
            [disabled]="_loading() || _resetting() || _selectedUserIds().length === 0"
            [loading]="_resetting()"
            (clicked)="_apply()"
            icon="trash"
          >
            {{ _resetting() ? 'Сброс…' : 'Сбросить выбранным (' + _selectedUserIds().length + ')' }}
          </app-button>
        </div>
      </div>

      <!-- Users Selection Table Card -->
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        @if (_loading()) {
          <div class="p-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
            <mat-icon svgIcon="spinner" class="!w-8 !h-8 animate-spin mx-auto text-blue-600" />
            <p class="text-sm">Загрузка списка обучающихся…</p>
          </div>
        } @else if (_filteredUsers().length === 0) {
          <div class="p-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
            <mat-icon svgIcon="users" class="!w-10 !h-10 mx-auto text-slate-300 dark:text-slate-600" />
            <p class="text-sm font-medium text-slate-700 dark:text-slate-300">Пользователи не найдены</p>
            <p class="text-xs">Попробуйте изменить поисковый запрос</p>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium">
                  <th class="py-3 px-4 w-12 text-center">
                    <app-checkbox
                      [checked]="_isAllSelected()"
                      (checkedChange)="_toggleSelectAll()"
                    />
                  </th>
                  <th class="py-3 px-4">Обучающийся</th>
                  <th class="py-3 px-4">Email</th>
                  <th class="py-3 px-4">Идентификатор</th>
                  <th class="py-3 px-4 text-right">Статус</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80">
                @for (u of _filteredUsers(); track u.id) {
                  <tr
                    (click)="_toggleUser(u.id)"
                    class="cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    [class.bg-rose-50/30]="_isSelected(u.id)"
                    [class.dark:bg-rose-950/10]="_isSelected(u.id)"
                  >
                    <td class="py-3 px-4 text-center" (click)="$event.stopPropagation()">
                      <app-checkbox
                        [checked]="_isSelected(u.id)"
                        (checkedChange)="_toggleUser(u.id)"
                      />
                    </td>
                    <td class="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {{ u.fullName || 'Без имени' }}
                    </td>
                    <td class="py-3 px-4 text-slate-600 dark:text-slate-300 font-mono">
                      {{ u.email }}
                    </td>
                    <td class="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {{ u.id }}
                    </td>
                    <td class="py-3 px-4 text-right">
                      @if (_isSelected(u.id)) {
                        <app-badge variant="danger" size="sm">
                          К сбросу
                        </app-badge>
                      } @else {
                        <span class="text-slate-400">Не выбран</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatsResetEditorComponent {
  protected readonly _ref = inject(MatDialogRef<StatsResetEditorComponent, number>, { optional: true });
  private readonly _snack = inject(MatSnackBar);

  protected readonly _users = signal<UserListItemOut[]>([]);
  protected readonly _loading = signal(true);
  protected readonly _resetting = signal(false);
  protected readonly _searchQuery = signal('');
  protected readonly _selectedUserIds = signal<string[]>([]);

  protected readonly _filteredUsers = computed(() => {
    const q = this._searchQuery().trim().toLowerCase();
    const list = this._users();
    if (!q) return list;
    return list.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q)
    );
  });

  protected readonly _isAllSelected = computed(() => {
    const users = this._filteredUsers();
    const selected = this._selectedUserIds();
    return users.length > 0 && users.every((u) => selected.includes(u.id));
  });

  constructor() {
    void this._load();
  }

  protected async _load(): Promise<void> {
    try {
      const users = await apiCall(() => usersListUsers());
      this._users.set([...users].sort((a, b) => a.fullName.localeCompare(b.fullName)));
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : 'Ошибка запроса';
      this._snack.open(msg, 'OK', { duration: 5000 });
    } finally {
      this._loading.set(false);
    }
  }

  protected _isSelected(id: string): boolean {
    return this._selectedUserIds().includes(id);
  }

  protected _toggleUser(id: string): void {
    this._selectedUserIds.update((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
    );
  }

  protected _toggleSelectAll(): void {
    if (this._isAllSelected()) {
      const visibleIds = new Set(this._filteredUsers().map((u) => u.id));
      this._selectedUserIds.update((ids) => ids.filter((id) => !visibleIds.has(id)));
    } else {
      const visibleIds = this._filteredUsers().map((u) => u.id);
      this._selectedUserIds.update((ids) => Array.from(new Set([...ids, ...visibleIds])));
    }
  }

  protected async _apply(): Promise<void> {
    const userIds = this._selectedUserIds();
    if (!userIds.length || this._resetting()) return;

    if (!confirm(`Вы действительно хотите безвозвратно сбросить статистику для ${userIds.length} пользователей?`)) {
      return;
    }

    this._resetting.set(true);
    try {
      const res = await apiCall(() => usersResetUsersStats({ body: { userIds } }));
      this._snack.open(`Статистика сброшена для ${res.usersCount} польз.`, 'Закрыть', { duration: 4000 });
      this._selectedUserIds.set([]);
      this._ref?.close(res.usersCount);
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : 'Ошибка запроса';
      this._snack.open(msg, 'Закрыть', { duration: 5000 });
    } finally {
      this._resetting.set(false);
    }
  }
}
