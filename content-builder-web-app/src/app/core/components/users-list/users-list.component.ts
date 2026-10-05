import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { usersListUsers, usersUpdateUserStatus, usersGrantUserBonus, authSendResetLinkAdmin, usersAdminCreateUser, usersAdminUpdateUser, usersAdminDeleteUser } from '@/core/api/generated/sdk.gen';
import { apiCall, ApiError } from '@/core/api/api-utils';
import type { UserAdminCreate, UserAdminUpdate, UserListItemOut } from '@/core/api/generated/types.gen';
import { AppTariffsStorageService } from '@/core/api';
import { RouterLink } from '@angular/router';
import { AppDialogWrapperComponent } from '../dialog-wrapper/dialog-wrapper.component';
import { AppDialogService } from '@/core/services/app-dialog.service';
import { ConfirmDeleteDialogComponent, ConfirmDeleteDialogData } from '../folders-explorer/confirm-delete-dialog.component';
import {
  AppButtonComponent,
  AppIconButtonComponent,
  AppInputComponent,
  AppSelectComponent,
  AppSelectOption,
  AppBadgeComponent
} from '../ui';

interface EnhancedUser extends UserListItemOut {
  status: 'active' | 'banned';
  tariffName: string;
  score: number;
}

@Component({
  selector: 'app-user-bonus-dialog',
  imports: [
    ReactiveFormsModule,
    AppInputComponent,
    AppDialogWrapperComponent
  ],
  template: `
    <app-dialog-wrapper
      title="Начисление баллов пользователю"
      [subtitle]="_data.fullName + ' (' + _data.email + ')'"
      saveText="Начислить баллы"
      saveIcon="coins"
      [saveDisabled]="_form.invalid"
      (save)="_save()"
      (close)="_ref.close()"
    >
      <form class="flex flex-col gap-4 min-w-[320px] max-w-full" [formGroup]="_form">
        <app-input
          label="Количество баллов"
          type="number"
          icon="coins"
          [min]="1"
          formControlName="points"
          [required]="true"
        />
        <app-input
          label="Причина начисления"
          icon="comment-alt"
          placeholder="Например: За активность в курсе"
          formControlName="reason"
        />
      </form>
    </app-dialog-wrapper>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserBonusDialogComponent {
  protected readonly _data = inject<{ fullName: string; email: string }>(MAT_DIALOG_DATA);
  protected readonly _ref = inject(MatDialogRef<UserBonusDialogComponent, number | null>);
  protected readonly _form = new FormGroup({
    points: new FormControl<number>(100, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
    reason: new FormControl<string>('Поощрение от администрации', { nonNullable: true })
  });

  protected _save(): void {
    if (this._form.invalid) return;
    this._ref.close(this._form.getRawValue().points);
  }
}

type UserDialogResult =
  | { mode: 'create'; body: UserAdminCreate }
  | { mode: 'edit'; body: UserAdminUpdate };

@Component({
  selector: 'app-user-edit-dialog',
  imports: [
    ReactiveFormsModule,
    AppInputComponent,
    AppSelectComponent,
    AppIconButtonComponent,
    AppDialogWrapperComponent
  ],
  template: `
    <app-dialog-wrapper
      [title]="_data ? 'Редактировать пользователя' : 'Новый пользователь'"
      [subtitle]="_data ? _data.email : 'Аккаунт обучающегося или администратора платформы'"
      [saveText]="_data ? 'Сохранить' : 'Создать'"
      saveIcon="check"
      [saveDisabled]="_form.invalid"
      (save)="_save()"
      (close)="_ref.close()"
    >
      <form class="flex flex-col gap-4 min-w-[340px] max-w-full" [formGroup]="_form">
        @if (!_data) {
          <app-input
            label="Email"
            type="email"
            icon="envelope"
            formControlName="email"
            placeholder="user@example.com"
            [required]="true"
          />
          <app-select
            label="Способ задания пароля"
            icon="lock"
            formControlName="passwordMode"
            [options]="_passwordModeOptions"
          />
          @if (_form.controls.passwordMode.value === 'manual') {
            <div class="flex items-center gap-2">
              <app-input
                label="Пароль"
                class="flex-1"
                formControlName="password"
                hint="Передайте пароль пользователю самостоятельно"
                [required]="true"
              />
              <app-icon-button
                icon="rotate-right"
                variant="outline"
                size="md"
                tooltip="Сгенерировать надёжный пароль"
                (clicked)="_generatePassword()"
              />
            </div>
          }
        } @else {
          <app-input
            label="Email"
            icon="envelope"
            [value]="_data.email"
            [readonly]="true"
            hint="Email — идентификатор входа, изменению не подлежит"
          />
        }

        <app-input
          label="ФИО"
          formControlName="fullName"
          placeholder="Иванов Иван Иванович"
          [required]="true"
        />
        <app-select label="Роль" icon="shield-halved" formControlName="role" [options]="_roleOptions" />

        <div class="grid grid-cols-2 gap-3">
          <app-input label="Должность" formControlName="occupation" placeholder="Необязательно" />
          <app-input label="Год рождения" type="number" formControlName="birthYear" [min]="1900" [max]="2100" />
        </div>
      </form>
    </app-dialog-wrapper>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserEditDialogComponent {
  protected readonly _data = inject<EnhancedUser | null>(MAT_DIALOG_DATA);
  protected readonly _ref = inject(MatDialogRef<UserEditDialogComponent, UserDialogResult>);

  protected readonly _roleOptions: AppSelectOption[] = [
    { value: 'user', label: 'Пользователь' },
    { value: 'admin', label: 'Администратор' }
  ];
  protected readonly _passwordModeOptions: AppSelectOption[] = [
    { value: 'email', label: 'Отправить ссылку на email' },
    { value: 'manual', label: 'Задать пароль сейчас' }
  ];

  protected readonly _form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    passwordMode: new FormControl<'email' | 'manual'>('email', { nonNullable: true }),
    password: new FormControl<string | null>(null, { validators: [Validators.minLength(6), Validators.maxLength(100)] }),
    fullName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    role: new FormControl<'user' | 'admin'>('user', { nonNullable: true }),
    occupation: new FormControl<string | null>(null),
    birthYear: new FormControl<number | null>(null)
  });

  constructor() {
    const u = this._data;
    if (u) {
      this._form.patchValue({
        email: u.email,
        fullName: u.fullName || '',
        role: (u.role as 'user' | 'admin') || 'user',
        occupation: u.occupation ?? null,
        birthYear: u.birthYear ?? null
      });
    }
    this._form.controls.passwordMode.valueChanges.subscribe((mode) => {
      const pw = this._form.controls.password;
      if (mode === 'manual') {
        pw.addValidators(Validators.required);
      } else {
        pw.removeValidators(Validators.required);
        pw.setValue(null);
      }
      pw.updateValueAndValidity();
    });
  }

  protected _generatePassword(): void {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const rnd = new Uint32Array(12);
    crypto.getRandomValues(rnd);
    this._form.controls.password.setValue(Array.from(rnd, (n) => alphabet[n % alphabet.length]).join(''));
  }

  protected _save(): void {
    if (this._form.invalid) return;
    const v = this._form.getRawValue();
    const shared = {
      fullName: v.fullName.trim(),
      role: v.role,
      occupation: v.occupation?.trim() || null,
      birthYear: v.birthYear
    };
    if (this._data) {
      this._ref.close({ mode: 'edit', body: shared });
    } else {
      this._ref.close({
        mode: 'create',
        body: {
          email: v.email.trim(),
          ...shared,
          ...(v.passwordMode === 'manual' && v.password ? { password: v.password } : {})
        }
      });
    }
  }
}

@Component({
  selector: 'app-users-list',
  imports: [
    FormsModule,
    MatIcon,
    MatSnackBarModule,
    RouterLink,
    AppButtonComponent,
    AppIconButtonComponent,
    AppInputComponent,
    AppBadgeComponent
  ],
  template: `
    <div class="p-6 max-w-7xl mx-auto space-y-6">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Управление пользователями
            </h1>
            <span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {{ _filteredUsers().length }}
            </span>
          </div>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Создание, редактирование и удаление пользователей, управление доступом и начисление бонусов
          </p>
        </div>

        <div class="flex items-center gap-2">
          <app-button variant="primary" icon="plus" (clicked)="_createUser()">
            Создать пользователя
          </app-button>
          <a routerLink="/stats-reset">
            <app-button variant="outline" icon="trash">
              Сброс статистики
            </app-button>
          </a>
          <app-icon-button
            icon="rotate-right"
            size="md"
            variant="outline"
            tooltip="Обновить список"
            (clicked)="_loadUsers()"
          />
        </div>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
        <app-input
          [value]="_searchQuery()"
          (valueChange)="_searchQuery.set($event)"
          placeholder="Поиск по имени, email или ID..."
          icon="magnifying-glass"
          [clearable]="true"
          class="flex-1 max-w-md"
        />

        <div class="flex items-center gap-2">
          <div class="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-medium gap-1">
            <app-button
              [variant]="_statusFilter() === 'all' ? 'secondary' : 'ghost'"
              size="sm"
              (click)="_statusFilter.set('all')"
            >
              Все
            </app-button>
            <app-button
              [variant]="_statusFilter() === 'active' ? 'secondary' : 'ghost'"
              size="sm"
              (click)="_statusFilter.set('active')"
            >
              Активные
            </app-button>
            <app-button
              [variant]="_statusFilter() === 'banned' ? 'secondary' : 'ghost'"
              size="sm"
              (click)="_statusFilter.set('banned')"
            >
              Заблокированные
            </app-button>
          </div>
        </div>
      </div>

      <!-- Users Table Card -->
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        @if (_loading()) {
          <div class="p-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
            <mat-icon svgIcon="spinner" class="!w-8 !h-8 animate-spin mx-auto text-blue-600" />
            <p class="text-sm">Загрузка списка пользователей…</p>
          </div>
        } @else if (_filteredUsers().length === 0) {
          <div class="p-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
            <mat-icon svgIcon="users" class="!w-10 !h-10 mx-auto text-slate-300 dark:text-slate-600" />
            <p class="text-sm font-medium text-slate-700 dark:text-slate-300">Пользователи не найдены</p>
            <p class="text-xs">Попробуйте изменить поисковый запрос или фильтры</p>
          </div>
        } @else {
          <div class="app-table-container overflow-auto max-h-[calc(100vh-280px)]">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium">
                  <th class="py-3.5 px-4">Пользователь</th>
                  <th class="py-3.5 px-4">Контакты</th>
                  <th class="py-3.5 px-4">Тариф / Доступ</th>
                  <th class="py-3.5 px-4">Статус</th>
                  <th class="py-3.5 px-4">Баллы</th>
                  <th class="py-3.5 px-4 text-right">Действия</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80">
                @for (u of _filteredUsers(); track u.id) {
                  <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <!-- User Info -->
                    <td class="py-3 px-4">
                      <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                          {{ _getInitials(u.fullName) }}
                        </div>
                        <div class="min-w-0">
                          <p class="font-semibold text-slate-900 dark:text-white truncate">
                            {{ u.fullName || 'Без имени' }}
                          </p>
                        </div>
                      
                        <app-icon-button
                          icon="key"
                          size="sm"
                          variant="ghost"
                          tooltip="Отправить ссылку для сброса пароля"
                          (clicked)="_sendResetLink(u)"
                        />
                      </div>
                    </td>

                    <!-- Contact -->
                    <td class="py-3 px-4 text-slate-600 dark:text-slate-300">
                      <div class="font-mono text-[11px] truncate max-w-[220px]">{{ u.email }}</div>
                    </td>

                    <!-- Tariff -->
                    <td class="py-3 px-4">
                      <app-badge variant="primary" size="sm">
                        {{ u.tariffName || 'Стандарт' }}
                      </app-badge>
                    </td>

                    <!-- Status -->
                    <td class="py-3 px-4">
                      @if (u.status === 'active') {
                        <app-badge variant="success" size="sm" [dot]="true">
                          Активен
                        </app-badge>
                      } @else {
                        <app-badge variant="danger" size="sm" [dot]="true">
                          Заблокирован
                        </app-badge>
                      }
                    </td>

                    <!-- Scores -->
                    <td class="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {{ u.score ?? 0 }} баллов
                    </td>

                    <!-- Actions -->
                    <td class="py-3 px-4 text-right">
                      <div class="flex items-center justify-end gap-1">
                        <app-icon-button
                          icon="edit"
                          size="sm"
                          variant="ghost"
                          tooltip="Редактировать пользователя"
                          (clicked)="_editUser(u)"
                        />
                        <app-icon-button
                          [icon]="u.status === 'active' ? 'ban' : 'check'"
                          size="sm"
                          [variant]="u.status === 'active' ? 'danger' : 'ghost'"
                          [tooltip]="u.status === 'active' ? 'Заблокировать пользователя' : 'Разблокировать'"
                          (clicked)="_toggleBlock(u)"
                        />
                        <app-icon-button
                          icon="gift"
                          size="sm"
                          variant="ghost"
                          tooltip="Начислить бонусные баллы"
                          (clicked)="_grantReward(u)"
                        />

                        <app-icon-button
                          icon="key"
                          size="sm"
                          variant="ghost"
                          tooltip="Отправить ссылку для сброса пароля"
                          (clicked)="_sendResetLink(u)"
                        />
                        <app-icon-button
                          icon="trash"
                          size="sm"
                          variant="danger"
                          tooltip="Удалить пользователя"
                          (clicked)="_deleteUser(u)"
                        />
                      </div>
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
export class UsersListComponent {
  private readonly _snack = inject(MatSnackBar);
  private readonly _tariffsStorage = inject(AppTariffsStorageService);
  private readonly _dialogsService = inject(AppDialogService);

  protected readonly _users = signal<EnhancedUser[]>([]);
  protected readonly _loading = signal<boolean>(true);
  protected readonly _searchQuery = signal<string>('');
  protected readonly _statusFilter = signal<'all' | 'active' | 'banned'>('all');

  protected readonly _filteredUsers = computed(() => {
    const q = this._searchQuery().trim().toLowerCase();
    const filter = this._statusFilter();
    let list = this._users();

    if (filter !== 'all') {
      list = list.filter((u) => u.status === filter);
    }

    if (q) {
      list = list.filter(
        (u) =>
          u.fullName.toLowerCase().includes(q) ||
          u.id.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
    }

    return list;
  });

  constructor() {
    this._loadUsers();
  }

  protected _getInitials(name: string): string {
    if (!name) return 'TD';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  protected async _loadUsers(): Promise<void> {
    this._loading.set(true);
    try {
      const rawUsers = await apiCall(() => usersListUsers());
      const enhanced: EnhancedUser[] = (rawUsers || []).map((u) => ({
        ...u,
        status: u.status as 'active' | 'banned',
        tariffName: u.tariffName || 'Нет',
        score: u.score ?? 0
      }));

      this._users.set(enhanced);
    } catch (err) {
      this._snack.open(
        err instanceof ApiError ? err.detail : 'Не удалось загрузить пользователей',
        'Закрыть',
        { duration: 4000 }
      );
    } finally {
      this._loading.set(false);
    }
  }

  protected _toast(err: unknown, fallback: string): void {
    this._snack.open(err instanceof ApiError ? err.detail : fallback, 'Закрыть', { duration: 5000 });
  }

  protected _createUser(): void {
    this._dialogsService
      .open(UserEditDialogComponent, { data: null, width: '520px' })
      .afterClosed()
      .subscribe(async (res) => {
        if (!res || res.mode !== 'create') return;
        try {
          const out = await apiCall(() => usersAdminCreateUser({ body: res.body }));
          this._snack.open(out.message, 'Закрыть', { duration: 5000 });
          await this._loadUsers();
        } catch (err) {
          this._toast(err, 'Не удалось создать пользователя');
        }
      });
  }

  protected _editUser(u: EnhancedUser): void {
    this._dialogsService
      .open(UserEditDialogComponent, { data: u, width: '520px' })
      .afterClosed()
      .subscribe(async (res) => {
        if (!res || res.mode !== 'edit') return;
        try {
          await apiCall(() => usersAdminUpdateUser({ path: { user_id: u.id }, body: res.body }));
          this._snack.open('Изменения сохранены', 'Закрыть', { duration: 3000 });
          await this._loadUsers();
        } catch (err) {
          this._toast(err, 'Не удалось сохранить изменения');
        }
      });
  }

  protected async _deleteUser(u: EnhancedUser): Promise<void> {
    const confirmed = await firstValueFrom(
      this._dialogsService
        .open<ConfirmDeleteDialogComponent, ConfirmDeleteDialogData, boolean>(ConfirmDeleteDialogComponent, {
          width: '420px',
          data: { name: u.fullName || u.email, typeName: 'пользователя', isFolder: false }
        })
        .afterClosed()
    );
    if (!confirmed) return;
    try {
      await apiCall(() => usersAdminDeleteUser({ path: { user_id: u.id } }));
      this._snack.open(`Пользователь «${u.fullName || u.email}» удалён`, 'Закрыть', { duration: 3000 });
      await this._loadUsers();
    } catch (err) {
      this._toast(err, 'Не удалось удалить пользователя');
    }
  }

  protected async _toggleBlock(u: EnhancedUser): Promise<void> {
    const nextStatus = u.status === 'active' ? 'banned' : 'active';
    const actionText = nextStatus === 'banned' ? 'заблокирован' : 'разблокирован';
    try {
      await apiCall(() => usersUpdateUserStatus({ path: { user_id: u.id }, body: { status: nextStatus } }));
      this._users.update((list) =>
        list.map((item) => (item.id === u.id ? { ...item, status: nextStatus } : item))
      );
      this._snack.open(`Пользователь «${u.fullName}» ${actionText}`, 'Закрыть', { duration: 3000 });
    } catch (err) {
      this._snack.open('Ошибка смены статуса', 'Закрыть', { duration: 3000 });
    }
  }
  protected _grantReward(u: EnhancedUser): void {
    this._dialogsService
      .open(UserBonusDialogComponent, {
        data: { fullName: u.fullName, email: u.email },
        width: '440px'
      })
      .afterClosed()
      .subscribe(async (points: number | null | undefined) => {
        if (!points) return;
        try {
          await apiCall(() => usersGrantUserBonus({ path: { user_id: u.id }, body: { points, reason: 'Бонус от администратора' } }));
          this._users.update((list) =>
            list.map((item) => (item.id === u.id ? { ...item, score: (item.score ?? 0) + points } : item))
          );
          this._snack.open(`Начислено +${points} баллов пользователю «${u.fullName}»`, 'Закрыть', { duration: 3000 });
        } catch (err) {
          this._snack.open('Ошибка начисления баллов', 'Закрыть', { duration: 3000 });
        }
      });
  }

  protected async _sendResetLink(u: EnhancedUser): Promise<void> {
    try {
      await apiCall(() => authSendResetLinkAdmin({ body: { email: u.email } }));
      this._snack.open(`Ссылка для сброса пароля отправлена на ${u.email}`, 'Закрыть', { duration: 3000 });
    } catch (err) {
      this._snack.open('Ошибка отправки ссылки', 'Закрыть', { duration: 3000 });
    }
  }
}
