import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  authSendResetLinkAdmin,
  notificationsBroadcastNotification,
  systemSettingsGetSystemSettings,
  systemSettingsUpdateSystemSettings
} from '@/core/api/generated/sdk.gen';
import { apiCall, ApiError } from '@/core/api/api-utils';
import { AppDialogWrapperComponent } from '../dialog-wrapper/dialog-wrapper.component';
import { AppDialogService } from '@/core/services/app-dialog.service';
import {
  AppButtonComponent,
  AppIconButtonComponent,
  AppInputComponent,
  AppSelectComponent,
  AppSelectOption,
  AppTextareaComponent
} from '../ui';

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
    AppInputComponent,
    AppSelectComponent,
    AppDialogWrapperComponent
  ],
  template: `
    <app-dialog-wrapper
      title="Пригласить сотрудника"
      subtitle="Предоставление доступа сотруднику к панели управления"
      saveText="Отправить приглашение"
      saveIcon="paper-plane"
      [saveDisabled]="_form.invalid"
      (save)="_save()"
      (close)="_ref.close()"
    >
      <form class="flex flex-col gap-4 min-w-[320px] max-w-full" [formGroup]="_form">
        <app-input
          label="Имя сотрудника"
          icon="user"
          formControlName="name"
          placeholder="Например: Иван Петров"
          [required]="true"
        />
        <app-input
          label="Рабочий Email"
          type="email"
          icon="envelope"
          formControlName="email"
          placeholder="ivan@trouble-dent.ru"
          [required]="true"
        />
        <app-select
          label="Роль в системе"
          icon="shield-halved"
          formControlName="role"
          [options]="_roleOptions"
          [required]="true"
        />
        <p class="text-[11px] text-slate-400 -mt-1">
          Сотрудник получит доступ администратора панели и письмо со ссылкой для задания пароля.
        </p>
      </form>
    </app-dialog-wrapper>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminInviteDialogComponent {
  protected readonly _ref = inject(MatDialogRef<AdminInviteDialogComponent, AdminRoleUser | null>);
  protected readonly _roleOptions: AppSelectOption[] = [
    { value: 'content_editor', label: 'Редактор контента' },
    { value: 'finance', label: 'Финансовый контролер' },
    { value: 'support', label: 'Служба поддержки' },
    { value: 'superadmin', label: 'Суперадминистратор' }
  ];
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
    MatSnackBarModule,
    MatSlideToggleModule,
    AppButtonComponent,
    AppIconButtonComponent,
    AppInputComponent,
    AppSelectComponent,
    AppTextareaComponent
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

        <app-button
          icon="check"
          [loading]="_savingSettings()"
          (clicked)="_saveAll()"
          class="self-start md:self-auto"
        >
          Сохранить настройки
        </app-button>
      </div>

      <!-- Test-mode notice -->
      <div class="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300">
        <mat-icon svgIcon="exclamation-circle" class="!w-4 !h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span class="font-semibold">Тестовая форма.</span> Внесённые здесь данные нигде не применяются и ни на что не влияют.
        </div>
      </div>

      <!-- Settings Tabs Navigation -->
      <div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <app-button
          [variant]="_activeTab() === 'general' ? 'primary' : 'ghost'"
          size="sm"
          (clicked)="_activeTab.set('general')"
        >
          Общие параметры
        </app-button>

        <app-button
          [variant]="_activeTab() === 'ai' ? 'primary' : 'ghost'"
          size="sm"
          (clicked)="_activeTab.set('ai')"
        >
          Искусственный интеллект
        </app-button>

        <app-button
          [variant]="_activeTab() === 'roles' ? 'primary' : 'ghost'"
          size="sm"
          (clicked)="_activeTab.set('roles')"
        >
          Роли и сотрудники
        </app-button>

        <app-button
          [variant]="_activeTab() === 'notifications' ? 'primary' : 'ghost'"
          size="sm"
          (clicked)="_activeTab.set('notifications')"
        >
          Уведомления
        </app-button>
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

            <div class="space-y-4">
              <app-input
                type="number"
                label="Максимум попыток сдачи теста в день"
                [(ngModel)]="_maxDailyAttempts"
                [min]="1"
              />

              <app-input
                type="number"
                label="Минимальный проходной балл для спасения (%)"
                [(ngModel)]="_passPercentage"
                [min]="1"
                [max]="100"
              />

              <app-input
                type="number"
                label="Дней бесплатного пробного периода"
                [(ngModel)]="_trialDays"
                [min]="0"
              />
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
            <app-select
              label="Провайдер искусственного интеллекта"
              [options]="_aiProviderOptions"
              [(ngModel)]="_aiProvider"
            />

            <app-input
              label="Модель по умолчанию"
              placeholder="gemini-1.5-pro / gpt-4o"
              [(ngModel)]="_aiModel"
            />

            <app-input
              label="Ключ доступа к API"
              type="password"
              placeholder="sk-••••••••••••••••••••••••"
              [(ngModel)]="_aiApiKey"
            />

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

            <app-button
              variant="outline"
              size="sm"
              icon="plus"
              (clicked)="_inviteAdmin()"
            >
              Пригласить администратора
            </app-button>
          </div>

          <div class="app-table-container overflow-auto max-h-[calc(100vh-320px)]">
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
                      <app-icon-button
                        icon="trash"
                        size="sm"
                        variant="danger"
                        tooltip="Отозвать доступ"
                        (clicked)="_removeAdmin(admin)"
                      />
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
            <app-input
              label="Заголовок уведомления"
              [(ngModel)]="_notifyTitle"
            />

            <app-textarea
              label="Текст сообщения"
              [rows]="3"
              [(ngModel)]="_notifyBody"
            />

            <app-button
              icon="bell"
              [disabled]="!_notifyTitle.trim() || !_notifyBody.trim()"
              [loading]="_sendingNotification()"
              (clicked)="_sendBroadcastNotification()"
            >
              {{ _sendingNotification() ? 'Отправка…' : 'Отправить всем пользователям' }}
            </app-button>
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

  protected readonly _aiProviderOptions: AppSelectOption[] = [
    { value: 'gemini', label: 'Google Gemini' },
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic Claude' }
  ];

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
  protected _notifyTitle = 'Плановое обновление платформы Trouble Dent';
  protected _notifyBody = 'В субботу с 02:00 до 03:00 МСК будут проводиться технические работы.';
  protected readonly _sendingNotification = signal(false);

  // Admins List
  protected readonly _admins = signal<AdminRoleUser[]>([
    { id: '1', name: 'Главный Администратор', email: 'admin@trouble-dent.ru', role: 'superadmin', status: 'active' },
    { id: '2', name: 'Ольга Куратор', email: 'olga.content@trouble-dent.ru', role: 'content_editor', status: 'active' },
    { id: '3', name: 'Виктор Финансист', email: 'victor.billing@trouble-dent.ru', role: 'finance', status: 'active' },
    { id: '4', name: 'Техническая Поддержка', email: 'support@trouble-dent.ru', role: 'support', status: 'active' }
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

  constructor() {
    void this._loadSettings();
  }

  protected readonly _savingSettings = signal(false);

  private async _loadSettings(): Promise<void> {
    try {
      const settings = await apiCall(() => systemSettingsGetSystemSettings());
      this._maintenanceMode = settings.maintenanceMode ?? false;
    } catch {
      // оставляем локальные значения по умолчанию
    }
  }

  protected _saveAll(): void {
    void (async () => {
      this._savingSettings.set(true);
      try {
        await apiCall(() =>
          systemSettingsUpdateSystemSettings({ body: { maintenanceMode: this._maintenanceMode } })
        );
        this._snack.open('Настройки сохранены', 'Закрыть', { duration: 3000 });
      } catch (err) {
        const msg = err instanceof ApiError ? err.detail : 'Не удалось сохранить настройки';
        this._snack.open(msg, 'Закрыть', { duration: 5000 });
      } finally {
        this._savingSettings.set(false);
      }
    })();
  }

  protected _inviteAdmin(): void {
    this._dialogsService
      .open(AdminInviteDialogComponent, { width: '480px' })
      .afterClosed()
      .subscribe(async (newAdmin: AdminRoleUser | null | undefined) => {
        if (!newAdmin) return;
        try {
          await apiCall(() =>
            authSendResetLinkAdmin({ body: { email: newAdmin.email, fullName: newAdmin.name } })
          );
          this._admins.update((list) => [...list, newAdmin]);
          this._snack.open(`Приглашение отправлено на ${newAdmin.email}`, 'Закрыть', { duration: 3000 });
        } catch (err) {
          const msg = err instanceof ApiError ? err.detail : 'Не удалось отправить приглашение';
          this._snack.open(msg, 'Закрыть', { duration: 5000 });
        }
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
