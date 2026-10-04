import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { AppDialogWrapperComponent } from '../dialog-wrapper/dialog-wrapper.component';
import { AppButtonComponent, AppInputComponent, AppSelectComponent, AppSelectOption, AppTextareaComponent } from '../ui';
import { AppTariffsStorageService } from '@/core/api';
import { notificationsBroadcastNotification } from '@/core/api/generated/sdk.gen';
import { apiCall } from '@/core/api/api-utils';
import { from } from 'rxjs';

export type TestNotificationDialogResult = {
  success: boolean;
  message: string;
};

@Component({
  selector: 'app-test-notification-dialog',
  imports: [
    ReactiveFormsModule,
    AppDialogWrapperComponent,
    AppInputComponent,
    AppTextareaComponent,
    AppSelectComponent
  ],
  template: `
    <app-dialog-wrapper
      title="Тестовая рассылка уведомлений"
      subtitle="Отправка push-уведомления аудитории"
      saveText="Отправить push"
      saveIcon="paper-plane"
      [saveDisabled]="_form.invalid || _sending()"
      [loading]="_sending()"
      (save)="_send()"
      (close)="_close()"
    >
      <div class="flex flex-col gap-4 min-w-[min(90vw,480px)]">
        <app-input
          label="Заголовок"
          placeholder="Например: Новое спасение доступно!"
          [formControl]="_form.controls.title"
        />

        <app-textarea
          label="Текст сообщения"
          placeholder="Текст push-уведомления для пользователей"
          [rows]="3"
          [formControl]="_form.controls.body"
        />

        <app-select
          label="Целевая аудитория"
          [options]="_audienceOptions"
          [formControl]="_form.controls.audience"
        />

        @if (_form.controls.audience.value === 'tariff') {
          <app-select
            label="Тариф"
            [options]="_tariffOptions()"
            [formControl]="_form.controls.tariffId"
          />
        }

        <app-input
          label="Ссылка для перехода (необязательно)"
          placeholder="Например: /article/uuid или https://..."
          [formControl]="_form.controls.targetUrl"
        />

        @if (_error(); as err) {
          <div class="p-3 text-xs rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
            {{ err }}
          </div>
        }
      </div>
    </app-dialog-wrapper>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TestNotificationDialogComponent {
  private readonly _ref = inject(MatDialogRef<TestNotificationDialogComponent, TestNotificationDialogResult | undefined>);
  private readonly _tariffsStorage = inject(AppTariffsStorageService);

  protected readonly _sending = signal(false);
  protected readonly _error = signal<string | null>(null);
  protected readonly _tariffs = signal<Array<{ id: string; title: string }>>([]);

  protected readonly _audienceOptions: AppSelectOption[] = [
    { value: 'all', label: 'Все активные пользователи' },
    { value: 'tariff', label: 'Пользователи с определённым тарифом' }
  ];

  protected readonly _tariffOptions = computed<AppSelectOption[]>(() =>
    this._tariffs().map((t) => ({ value: t.id, label: t.title }))
  );

  protected readonly _form = new FormGroup({
    title: new FormControl('Тестовое уведомление', { nonNullable: true, validators: [Validators.required] }),
    body: new FormControl('Проверка системы уведомлений из Content Builder', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    audience: new FormControl<'all' | 'tariff'>('all', { nonNullable: true }),
    tariffId: new FormControl<string | null>(null),
    targetUrl: new FormControl<string | null>(null)
  });

  constructor() {
    this._tariffsStorage.listAll().subscribe({
      next: (list) => {
        this._tariffs.set(list.map((t) => ({ id: t.id, title: t.title })));
        if (list.length > 0) {
          this._form.controls.tariffId.setValue(list[0].id);
        }
      },
      error: () => this._tariffs.set([])
    });
  }

  protected _send(): void {
    if (this._form.invalid || this._sending()) return;
    this._sending.set(true);
    this._error.set(null);

    const val = this._form.getRawValue();
    const payload = {
      title: val.title,
      body: val.body,
      data: val.targetUrl ? { targetUrl: val.targetUrl } : undefined
    };

    from(
      apiCall(() =>
        notificationsBroadcastNotification({
          body: payload
        })
      )
    ).subscribe({
      next: (res) => {
        this._sending.set(false);
        this._ref.close({
          success: true,
          message: `Отправлено push-уведомлений: ${res.created}`
        });
      },
      error: (err: unknown) => {
        this._sending.set(false);
        this._error.set(err instanceof Error ? err.message : 'Ошибка отправки push-уведомления');
      }
    });
  }

  protected _close(): void {
    this._ref.close();
  }
}
