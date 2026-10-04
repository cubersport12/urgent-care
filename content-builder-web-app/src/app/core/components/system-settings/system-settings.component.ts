import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { notificationsBroadcastNotification } from '@/core/api/generated/sdk.gen';
import { apiCall, ApiError } from '@/core/api/api-utils';
import { AppDialogWrapperComponent } from '../dialog-wrapper/dialog-wrapper.component';
import { AppDialogService } from '@/core/services/app-dialog.service';

interface AdminRoleUser {
  id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'content_editor' | 'finance' | 'support';
  status: 'active' | 'invited';
}

@Component({
  selector: 'app-admin-invite-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    AppDialogWrapperComponent
  ],
  template: `
    <app-dialog-wrapper
      title="Пригласить сотрудника"
      subtitle="Предоставление доступа сотруднику к панели управления"
      saveText="Отправить приглашение"
      cancelText="Отмена"
      [saveDisabled]="_form.invalid"
      (save)="_save()"
      (close)="_ref.close()"
    >
      <form class="flex flex-col gap-3 min-w-[320px] max-w-full" [formGroup]="_form">
        <mat-form-field appearance="fill">
          <mat-label>Имя сотрудника</mat-label>
          <input matInput formControlName="name" placeholder="Например: Иван Петров" />
        </mat-form-field>
        <mat-form-field appearance="fill">
          <mat-label>Рабочий Email</mat-label>
          <input matInput type="email" formControlName="email" placeholder="ivan@urgent-care.ru" />
        </mat-form-field>
        <mat-form-field appearance="fill">
          <mat-label>Роль в системе</mat-label>
          <mat-select formControlName="role">
            <mat-option value="content_editor">Редактор контента</mat-option>
            <mat-option value="finance">Финансовый контролер</mat-option>
            <mat-option value="support">Служба поддержки</mat-option>
            <mat-option value="superadmin">Суперадминистратор</mat-option>
          </mat-select>
        </mat-form-field>
      </form>
    </app-dialog-wrapper>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminInviteDialogComponent {
  protected readonly _ref = inject(MatDialogRef<AdminInviteDialogComponent, AdminRoleUser | null>);
  protected readonly _form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    role: new FormControl<AdminRoleUser['role']>('content_editor', { nonNullable: true, validators: [Validators.required] })
  });

  protected _save(): void {
    if (this._form.invalid) return;
    const v = this._form.getRawValue();
    this._ref.close({
      id: String(Date.now()),
      name: v.name,
      email: v.email,
      role: v.role,
      status: 'active'
    });
  }
}

@Component({
  selector: 'app-system-settings',
  imports: [
    FormsModule,
    MatIcon,
    MatButtonModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatSlideToggleModule
  ],
  template: `
    <div class="p-6 max-w-7xl mx-auto space-y-6">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Системные настройки и управление доступом
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Конфигурация параметров приложения, интеграция с сервисами искусственного интеллекта и ролевая модель администраторов
          </p>
        </div>

        <button
          type="button"
          mat-flat-button
          color="primary"
          (click)="_saveAll()"
          class="!rounded-xl !px-4 !py-2.5 !shadow-sm flex items-center gap-2 self-start md:self-auto"
        >
          <mat-icon svgIcon="check" class="!w-4 !h-4 mr-1" />
          Сохранить настройки
        </button>
      </div>

      <!-- Settings Tabs Navigation -->
      <div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          (click)="_activeTab.set('general')"
          class="px-4 py-2 text-xs font-semibold rounded-xl transition-all"
          [class.bg-blue-600]="_activeTab() === 'general'"
          [class.text-white]="_activeTab() === 'general'"
          [class.text-slate-600]="_activeTab() !== 'general'"
          [class.dark:text-slate-300]="_activeTab() !== 'general'"
          [class.hover:bg-slate-100]="_activeTab() !== 'general'"
          [class.dark:hover:bg-slate-800]="_activeTab() !== 'general'"
        >
          Общие параметры
        </button>

        <button
          type="button"
          (click)="_activeTab.set('ai')"
          class="px-4 py-2 text-xs font-semibold rounded-xl transition-all"
          [class.bg-blue-600]="_activeTab() === 'ai'"
          [class.text-white]="_activeTab() === 'ai'"
          [class.text-slate-600]="_activeTab() !== 'ai'"
          [class.dark:text-slate-300]="_activeTab() !== 'ai'"
          [class.hover:bg-slate-100]="_activeTab() !== 'ai'"
          [class.dark:hover:bg-slate-800]="_activeTab() !== 'ai'"
        >
          Искусственный интеллект
        </button>

        <button
          type="button"
          (click)="_activeTab.set('roles')"
          class="px-4 py-2 text-xs font-semibold rounded-xl transition-all"
          [class.bg-blue-600]="_activeTab() === 'roles'"
          [class.text-white]="_activeTab() === 'roles'"
          [class.text-slate-600]="_activeTab() !== 'roles'"
          [class.dark:text-slate-300]="_activeTab() !== 'roles'"
          [class.hover:bg-slate-100]="_activeTab() !== 'roles'"
          [class.dark:hover:bg-slate-800]="_activeTab() !== 'roles'"
        >
          Роли и сотрудники
        </button>

        <button
          type="button"
          (click)="_activeTab.set('notifications')"
          class="px-4 py-2 text-xs font-semibold rounded-xl transition-all"
          [class.bg-blue-600]="_activeTab() === 'notifications'"
          [class.text-white]="_activeTab() === 'notifications'"
          [class.text-slate-600]="_activeTab() !== 'notifications'"
          [class.dark:text-slate-300]="_activeTab() !== 'notifications'"
          [class.hover:bg-slate-100]="_activeTab() !== 'notifications'"
          [class.dark:hover:bg-slate-800]="_activeTab() !== 'notifications'"
        >
          Уведомления
        </button>
      </div>

      <!-- Tab: General Settings -->
      @if (_activeTab() === 'general') {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-5">
            <h2 class="text-base font-bold text-slate-900 dark:text-white">Режим работы платформы</h2>

            <div class="space-y-4">
              <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div>
                  <p class="text-xs font-semibold text-slate-900 dark:text-white">Техническое обслуживание</p>
                  <p class="text-[11px] text-slate-500 dark:text-slate-400">Временно заблокировать доступ обычным пользователям</p>
                </div>
                <mat-slide-toggle [(ngModel)]="_maintenanceMode" color="primary"></mat-slide-toggle>
              </div>

              <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div>
                  <p class="text-xs font-semibold text-slate-900 dark:text-white">Регистрация новых пользователей</p>
                  <p class="text-[11px] text-slate-500 dark:text-slate-400">Разрешить новым аккаунтам создавать профиль</p>
                </div>
                <mat-slide-toggle [(ngModel)]="_allowRegistrations" color="primary"></mat-slide-toggle>
              </div>

              <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div>
                  <p class="text-xs font-semibold text-slate-900 dark:text-white">Автоматическая выдача сертификатов</p>
                  <p class="text-[11px] text-slate-500 dark:text-slate-400">Генерировать сертификат сразу при 100% прохождении курса</p>
                </div>
                <mat-slide-toggle [(ngModel)]="_autoCertificates" color="primary"></mat-slide-toggle>
              </div>
            </div>
          </div>

          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
            <h2 class="text-base font-bold text-slate-900 dark:text-white">Ограничения обучения</h2>

            <div class="space-y-3">
              <div>
                <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Максимум попыток сдачи теста в день
                </label>
                <input
                  type="number"
                  [(ngModel)]="_maxDailyAttempts"
                  class="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Минимальный проходной балл для спасения (%)
                </label>
                <input
                  type="number"
                  [(ngModel)]="_passPercentage"
                  class="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Дней бесплатного пробного периода
                </label>
                <input
                  type="number"
                  [(ngModel)]="_trialDays"
                  class="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Tab: AI Settings -->
      @if (_activeTab() === 'ai') {
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm max-w-3xl space-y-5">
          <div>
            <h2 class="text-base font-bold text-slate-900 dark:text-white">Конфигурация генератора на основе ИИ</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Настройки искусственного интеллекта для автоматической генерации тестов и клинических сценариев спасения
            </p>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Провайдер искусственного интеллекта</label>
              <select
                [(ngModel)]="_aiProvider"
                class="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              >
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic Claude</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Модель по умолчанию</label>
              <input
                type="text"
                [(ngModel)]="_aiModel"
                placeholder="gemini-1.5-pro / gpt-4o"
                class="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Ключ доступа к API</label>
              <input
                type="password"
                [(ngModel)]="_aiApiKey"
                placeholder="sk-••••••••••••••••••••••••"
                class="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>

            <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <div>
                <p class="text-xs font-semibold text-slate-900 dark:text-white">Автоматическая валидация медицинских протоколов</p>
                <p class="text-[11px] text-slate-500 dark:text-slate-400">Проверять сгенерированные препараты и дозировки по встроенной базе</p>
              </div>
              <mat-slide-toggle [(ngModel)]="_aiMedicalValidation" color="primary"></mat-slide-toggle>
            </div>
          </div>
        </div>
      }

      <!-- Tab: Roles & Admins -->
      @if (_activeTab() === 'roles') {
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden space-y-4 p-6">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-base font-bold text-slate-900 dark:text-white">Администраторы и роли</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Управление сотрудниками с доступом к панели администратора
              </p>
            </div>

            <button
              type="button"
              mat-stroked-button
              (click)="_inviteAdmin()"
              class="!rounded-xl !border-slate-300 dark:!border-slate-700 !text-slate-700 dark:!text-slate-300 text-xs"
            >
              <mat-icon svgIcon="plus" class="!w-4 !h-4 mr-1 text-blue-600" />
              Пригласить администратора
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium">
                  <th class="py-3 px-4">Сотрудник</th>
                  <th class="py-3 px-4">Email</th>
                  <th class="py-3 px-4">Роль</th>
                  <th class="py-3 px-4">Статус</th>
                  <th class="py-3 px-4 text-right">Действия</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80">
                @for (admin of _admins(); track admin.id) {
                  <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td class="py-3 px-4 font-semibold text-slate-900 dark:text-white">{{ admin.name }}</td>
                    <td class="py-3 px-4 text-slate-500 font-mono">{{ admin.email }}</td>
                    <td class="py-3 px-4">
                      <span [class]="'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ' + _getRoleBadge(admin.role)">
                        {{ _getRoleLabel(admin.role) }}
                      </span>
                    </td>
                    <td class="py-3 px-4">
                      <span class="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Активен
                      </span>
                    </td>
                    <td class="py-3 px-4 text-right">
                      <button
                        type="button"
                        mat-icon-button
                        (click)="_removeAdmin(admin)"
                        matTooltip="Отозвать доступ"
                        class="table-icon-btn text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                      >
                        <mat-icon svgIcon="trash" class="!w-4 !h-4" />
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Tab: Notifications -->
      @if (_activeTab() === 'notifications') {
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm max-w-2xl space-y-5">
          <div>
            <h2 class="text-base font-bold text-slate-900 dark:text-white">Широковещательные уведомления</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Отправка системных всплывающих оповещений всем зарегистрированным пользователям платформы
            </p>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Заголовок уведомления</label>
              <input
                type="text"
                [(ngModel)]="_notifyTitle"
                class="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Текст сообщения</label>
              <textarea
                rows="3"
                [(ngModel)]="_notifyBody"
                class="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              ></textarea>
            </div>

            <button
              type="button"
              mat-flat-button
              color="primary"
              [disabled]="_sendingNotification() || !_notifyTitle.trim() || !_notifyBody.trim()"
              (click)="_sendBroadcastNotification()"
              class="!rounded-xl !px-4 !py-2.5 !shadow-sm flex items-center gap-2"
            >
              <mat-icon svgIcon="bell" class="!w-4 !h-4 mr-1" />
              {{ _sendingNotification() ? 'Отправка…' : 'Отправить всем пользователям' }}
            </button>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SystemSettingsComponent {
  private readonly _snack = inject(MatSnackBar);
  private readonly _dialogsService = inject(AppDialogService);

  protected readonly _activeTab = signal<'general' | 'ai' | 'roles' | 'notifications'>('general');

  // General Settings State
  protected _maintenanceMode = false;
  protected _allowRegistrations = true;
  protected _autoCertificates = true;
  protected _maxDailyAttempts = 3;
  protected _passPercentage = 80;
  protected _trialDays = 7;

  // AI Settings State
  protected _aiProvider = 'gemini';
  protected _aiModel = 'gemini-1.5-pro';
  protected _aiApiKey = 'sk-uc-live-key-secured';
  protected _aiMedicalValidation = true;

  // Notifications State
  protected _notifyTitle = 'Плановое обновление платформы Urgent Care';
  protected _notifyBody = 'В субботу с 02:00 до 03:00 МСК будут проводиться технические работы.';
  protected readonly _sendingNotification = signal(false);

  // Admins List
  protected readonly _admins = signal<AdminRoleUser[]>([
    { id: '1', name: 'Главный Администратор', email: 'admin@urgent-care.ru', role: 'superadmin', status: 'active' },
    { id: '2', name: 'Ольга Куратор', email: 'olga.content@urgent-care.ru', role: 'content_editor', status: 'active' },
    { id: '3', name: 'Виктор Финансист', email: 'victor.billing@urgent-care.ru', role: 'finance', status: 'active' },
    { id: '4', name: 'Техническая Поддержка', email: 'support@urgent-care.ru', role: 'support', status: 'active' }
  ]);

  protected _getRoleLabel(role: AdminRoleUser['role']): string {
    switch (role) {
      case 'superadmin':
        return 'Суперадминистратор';
      case 'content_editor':
        return 'Редактор контента';
      case 'finance':
        return 'Финансовый контролер';
      case 'support':
        return 'Служба поддержки';
    }
  }

  protected _getRoleBadge(role: AdminRoleUser['role']): string {
    switch (role) {
      case 'superadmin':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300';
      case 'content_editor':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300';
      case 'finance':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
      case 'support':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
    }
  }

  protected _saveAll(): void {
    this._snack.open('Настройки успешно сохранены', 'Закрыть', { duration: 3000 });
  }

  protected _inviteAdmin(): void {
    this._dialogsService
      .open(AdminInviteDialogComponent, { width: '480px' })
      .afterClosed()
      .subscribe((newAdmin: AdminRoleUser | null | undefined) => {
        if (!newAdmin) return;
        this._admins.update((list) => [...list, newAdmin]);
        this._snack.open(`Приглашение отправлено на ${newAdmin.email}`, 'Закрыть', { duration: 3000 });
      });
  }

  protected _removeAdmin(admin: AdminRoleUser): void {
    if (admin.role === 'superadmin') {
      this._snack.open('Нельзя удалить главного администратора', 'Закрыть', { duration: 4000 });
      return;
    }
    this._admins.update((list) => list.filter((a) => a.id !== admin.id));
    this._snack.open(`Доступ отозван для ${admin.name}`, 'Закрыть', { duration: 3000 });
  }

  protected async _sendBroadcastNotification(): Promise<void> {
    if (!this._notifyTitle.trim() || !this._notifyBody.trim()) return;
    this._sendingNotification.set(true);
    try {
      const res = await apiCall(() =>
        notificationsBroadcastNotification({
          body: {
            title: this._notifyTitle.trim(),
            body: this._notifyBody.trim()
          }
        })
      );
      this._snack.open(`Уведомление отправлено всем пользователям (создано: ${res.created})`, 'Закрыть', {
        duration: 4000
      });
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : 'Ошибка при отправке оповещения';
      this._snack.open(msg, 'Закрыть', { duration: 5000 });
    } finally {
      this._sendingNotification.set(false);
    }
  }
}
