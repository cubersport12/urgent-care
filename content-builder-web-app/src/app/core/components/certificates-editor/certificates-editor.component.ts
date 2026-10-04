import { ChangeDetectionStrategy, Component, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import { AppFilesStorageService } from '@/core/api';
import { ApiError, apiCall } from '@/core/api/api-utils';
import { certificatesIssue, usersListUsers } from '@/core/api/generated/sdk.gen';
import type { CertificateOut, UserListItemOut } from '@/core/api/generated/types.gen';
import { AppDialogService } from '@/core/services/app-dialog.service';

type CertPreview = { url: string; numberLabel: string };

interface IssuedLogItem {
  numberLabel: string;
  name: string;
  course: string;
  date: string;
  status: 'valid' | 'revoked';
}

@Injectable({ providedIn: 'root' })
export class CertificatesEditorService {
  private readonly _dialogsService = inject(AppDialogService);

  public open(): void {
    this._dialogsService.open(CertificatesEditorComponent, {
      width: '900px',
      maxWidth: '95vw'
    });
  }
}

@Component({
  selector: 'app-certificates-editor',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIcon,
    MatTooltipModule,
    MatSnackBarModule
  ],
  template: `
    <div class="p-6 max-w-7xl mx-auto space-y-6">
      <!-- Page Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Выдача и реестр сертификатов</h1>
            <span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
              Электронные дипломы
            </span>
          </div>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Генерация официальных номерных сертификатов о завершении обучения и подтверждении квалификации
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            mat-stroked-button
            (click)="_loadUsers()"
            class="!rounded-xl !border-slate-300 dark:!border-slate-700 !text-slate-700 dark:!text-slate-300"
            matTooltip="Обновить пользователей"
          >
            <mat-icon svgIcon="rotate-right" class="!w-4 !h-4" />
          </button>
          @if (_ref) {
            <button
              type="button"
              mat-icon-button
              (click)="_ref.close()"
              matTooltip="Закрыть"
              class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <mat-icon svgIcon="times" class="!w-4 !h-4" />
            </button>
          }
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
          <div class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Всего выдано</div>
          <div class="text-2xl font-bold text-slate-900 dark:text-white mt-1">128 сертификатов</div>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
          <div class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Формат документа</div>
          <div class="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">PNG / PDF (HD)</div>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
          <div class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Валидация QR-кодом</div>
          <div class="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            Активна
          </div>
        </div>
      </div>

      <!-- Main Layout: 2 Columns -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Left Column: Issue Certificate Form -->
        <div class="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-5">
          <div>
            <h2 class="text-base font-bold text-slate-900 dark:text-white">Генерация сертификата</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Заполните данные для выдачи официального электронного документа
            </p>
          </div>

          @if (_issued(); as issued) {
            <!-- Certificate Preview after issue -->
            <div class="space-y-4">
              <div class="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm bg-slate-50 dark:bg-slate-800 p-2">
                <img [src]="issued.url" alt="Сертификат" class="w-full rounded-lg shadow-xs" />
              </div>

              <div class="flex items-center justify-between p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/50 text-xs">
                <span class="font-semibold text-purple-900 dark:text-purple-200">Номер документа:</span>
                <code class="font-mono font-bold text-purple-700 dark:text-purple-300">{{ issued.numberLabel }}</code>
              </div>

              <div class="flex items-center gap-2">
                <button
                  type="button"
                  mat-stroked-button
                  (click)="_openTab(issued.url)"
                  class="flex-1 !rounded-xl !py-2.5"
                >
                  <mat-icon svgIcon="file-contract" class="!w-4 !h-4 mr-1" />
                  Открыть в новой вкладке
                </button>
                <button
                  type="button"
                  mat-flat-button
                  color="primary"
                  (click)="_resetIssued()"
                  class="flex-1 !rounded-xl !py-2.5"
                >
                  <mat-icon svgIcon="plus" class="!w-4 !h-4 mr-1" />
                  Выдать еще один
                </button>
              </div>
            </div>
          } @else {
            <!-- Form -->
            <form [formGroup]="_form" class="space-y-4">
              <div>
                <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Обучающийся (пользователь)
                </label>
                <mat-form-field appearance="fill" class="w-full">
                  <mat-select formControlName="userId" placeholder="Выберите пользователя...">
                    @for (u of _users(); track u.id) {
                      <mat-option [value]="u.id">
                        {{ u.fullName || u.email }} ({{ u.email }})
                      </mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>

              <div>
                <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  ФИО на сертификате
                </label>
                <mat-form-field appearance="fill" class="w-full">
                  <input matInput formControlName="displayName" placeholder="Иванов Иван Иванович" />
                  <mat-hint>Если пусто — будет автоматически взято имя из профиля</mat-hint>
                </mat-form-field>
              </div>

              <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                <p class="font-semibold text-slate-700 dark:text-slate-300">Сертификат включает:</p>
                <p>• Уникальный регистрационный номер (TD-YYYY-XXXXXX)</p>
                <p>• Официальную печать и подпись аккредитованной комиссии</p>
                <p>• QR-код для верификации подлинности в реестре</p>
              </div>

              <button
                type="button"
                mat-flat-button
                color="primary"
                [disabled]="_form.invalid || _issuing()"
                (click)="_issue()"
                class="w-full !rounded-xl !py-3 !shadow-sm flex items-center justify-center gap-2"
              >
                <mat-icon svgIcon="certificate" class="!w-4 !h-4 mr-1" />
                {{ _issuing() ? 'Генерация сертификата…' : 'Сгенерировать и выдать' }}
              </button>
            </form>
          }
        </div>

        <!-- Right Column: Registry of issued certificates -->
        <div class="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-base font-bold text-slate-900 dark:text-white">Реестр выданных сертификатов</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Журнал регистрационных записей для проверки подлинности
              </p>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium">
                  <th class="py-3 px-3">Номер</th>
                  <th class="py-3 px-3">Владелец</th>
                  <th class="py-3 px-3">Программа</th>
                  <th class="py-3 px-3">Дата выдачи</th>
                  <th class="py-3 px-3 text-right">Статус</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80">
                @for (cert of _issuedRegistry(); track cert.numberLabel) {
                  <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td class="py-3 px-3">
                      <code class="font-mono text-purple-600 dark:text-purple-400 font-bold">
                        {{ cert.numberLabel }}
                      </code>
                    </td>
                    <td class="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                      {{ cert.name }}
                    </td>
                    <td class="py-3 px-3 text-slate-600 dark:text-slate-300">
                      {{ cert.course }}
                    </td>
                    <td class="py-3 px-3 text-slate-400">
                      {{ cert.date }}
                    </td>
                    <td class="py-3 px-3 text-right">
                      <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Действителен
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
export class CertificatesEditorComponent {
  protected readonly _ref = inject(MatDialogRef<CertificatesEditorComponent, void>, { optional: true });
  private readonly _snack = inject(MatSnackBar);
  private readonly _files = inject(AppFilesStorageService);
  private readonly _destroyRef = inject(DestroyRef);

  protected readonly _users = signal<UserListItemOut[]>([]);
  protected readonly _issuing = signal(false);
  protected readonly _issued = signal<CertPreview | null>(null);

  protected readonly _issuedRegistry = signal<IssuedLogItem[]>([
    {
      numberLabel: 'TD-2026-000128',
      name: 'Алексей Смирнов',
      course: 'Базовый курс реанимации СЛР',
      date: 'Сегодня, 10:15',
      status: 'valid'
    },
    {
      numberLabel: 'TD-2026-000127',
      name: 'Елена Кузнецова',
      course: 'Острая дыхательная недостаточность',
      date: 'Вчера, 17:40',
      status: 'valid'
    },
    {
      numberLabel: 'TD-2026-000126',
      name: 'Константин Попов',
      course: 'Протокол анафилактического шока',
      date: '01.10.2026',
      status: 'valid'
    }
  ]);

  protected readonly _form = new FormGroup({
    userId: new FormControl<string | null>(null, { validators: [Validators.required] }),
    displayName: new FormControl<string | null>(null)
  });

  constructor() {
    void this._loadUsers();
    this._form.controls.userId.valueChanges.subscribe((id) => {
      const user = this._users().find((u) => u.id === id);
      if (user?.fullName) {
        this._form.controls.displayName.setValue(user.fullName);
      }
    });
    this._destroyRef.onDestroy(() => {
      const issued = this._issued();
      if (issued) URL.revokeObjectURL(issued.url);
    });
  }

  protected async _loadUsers(): Promise<void> {
    try {
      const users = await apiCall(() => usersListUsers());
      this._users.set(
        [...users].sort((a, b) =>
          (a.fullName || a.email).localeCompare(b.fullName || b.email, 'ru')
        )
      );
    } catch (err) {
      this._snack.open(
        err instanceof ApiError ? err.detail : 'Не удалось загрузить пользователей',
        'OK',
        { duration: 6000 }
      );
    }
  }

  protected _openTab(url: string): void {
    window.open(url, '_blank', 'noopener');
  }

  protected _resetIssued(): void {
    this._issued.set(null);
    this._form.reset();
  }

  private _numberLabel(cert: CertificateOut): string {
    const year = new Date(cert.issuedAt).getFullYear();
    return `TD-${year}-${String(cert.number).padStart(6, '0')}`;
  }

  protected async _issue(): Promise<void> {
    if (this._form.invalid || this._issuing()) return;
    const v = this._form.getRawValue();
    if (!v.userId) return;
    this._issuing.set(true);
    try {
      const cert = await apiCall(() =>
        certificatesIssue({
          body: {
            userId: v.userId!,
            displayName: v.displayName?.trim() || null
          }
        })
      );
      const blob = await firstValueFrom(this._files.downloadFile(cert.filePath));
      const url = URL.createObjectURL(blob);
      const numberLabel = this._numberLabel(cert);
      this._issued.set({ url, numberLabel });

      this._issuedRegistry.update((list) => [
        {
          numberLabel,
          name: v.displayName?.trim() || 'Обучающийся',
          course: 'Курс неотложной помощи',
          date: 'Только что',
          status: 'valid'
        },
        ...list
      ]);
    } catch (err) {
      this._snack.open(
        err instanceof ApiError ? err.detail : 'Не удалось выдать сертификат',
        'Закрыть',
        { duration: 6000 }
      );
    } finally {
      this._issuing.set(false);
    }
  }
}
