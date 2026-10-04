import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, Injectable, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AppFilesStorageService } from '@/core/api';
import { ApiError, apiCall } from '@/core/api/api-utils';
import { API_BASE } from '@/core/api/api-client';
import { legalListLegalDocuments } from '@/core/api/generated/sdk.gen';
import { AppDialogService } from '@/core/services/app-dialog.service';
import {
  AppButtonComponent,
  AppIconButtonComponent,
  AppBadgeComponent
} from '@/core/components/ui';

type LegalDocId = 'offer' | 'pdn' | 'consent' | 'consent-distribution' | 'cookies';
type LegalDocStatus = 'checking' | 'missing' | 'uploaded';

interface LegalDocCategory {
  id: LegalDocId;
  title: string;
  description: string;
  lawReference: string;
}

const LEGAL_CATEGORIES: LegalDocCategory[] = [
  {
    id: 'offer',
    title: 'Пользовательское соглашение (оферта)',
    description: 'Публичная оферта об оказании образовательных услуг и условиях платной подписки.',
    lawReference: 'ГК РФ ст. 437'
  },
  {
    id: 'pdn',
    title: 'Политика обработки персональных данных',
    description: 'Определяет порядок сбора, хранения и защиты персональных данных пользователей платформы.',
    lawReference: '152-ФЗ ст. 18.1'
  },
  {
    id: 'consent',
    title: 'Согласие на обработку персональных данных',
    description: 'Индивидуальное согласие пользователя, подтверждаемое при создании учетной записи.',
    lawReference: '152-ФЗ ст. 9'
  },
  {
    id: 'consent-distribution',
    title: 'Согласие на распространение персональных данных',
    description: 'Отдельное согласие на передачу данных третьим лицам и публикацию в открытых реестрах.',
    lawReference: '152-ФЗ ст. 10.1'
  },
  {
    id: 'cookies',
    title: 'Правила использования cookie',
    description: 'Уведомление об использовании cookies и локального хранилища браузера.',
    lawReference: 'Стандарты веб-безопасности'
  }
];

@Injectable({ providedIn: 'root' })
export class LegalDocsEditorService {
  private readonly _dialogsService = inject(AppDialogService);

  public open(): MatDialogRef<LegalDocsEditorComponent> {
    return this._dialogsService.open(LegalDocsEditorComponent, {
      width: '900px',
      maxWidth: '95vw'
    });
  }
}

@Component({
  selector: 'app-legal-docs-editor',
  imports: [
    MatDialogModule,
    MatIcon,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    AppButtonComponent,
    AppIconButtonComponent,
    AppBadgeComponent
  ],
  template: `
    <div class="p-6 max-w-7xl mx-auto space-y-6">
      <!-- Page Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Нормативные документы</h1>
            <app-badge variant="info" size="sm">
              PDF-файлы для сайта и мобильного приложения
            </app-badge>
          </div>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Публичные оферты, согласия на обработку ПДн и юридические документы, доступные пользователям без авторизации
          </p>
        </div>

        <div class="flex items-center gap-2">
          <app-icon-button
            icon="rotate-right"
            variant="outline"
            (click)="_loadStatuses()"
            tooltip="Проверить статусы документов"
          />
          @if (_ref) {
            <app-icon-button
              icon="times"
              variant="ghost"
              (click)="_ref.close()"
              tooltip="Закрыть"
            />
          }
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
          <div class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Всего категорий</div>
          <div class="text-2xl font-bold text-slate-900 dark:text-white mt-1">{{ _stats().total }}</div>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
          <div class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Загружено и доступно</div>
          <div class="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{{ _stats().uploaded }}</div>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
          <div class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Статус соответствия</div>
          <div class="text-base font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
            @if (_stats().missing === 0) {
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span class="text-emerald-600 dark:text-emerald-400">100% документов загружено</span>
            } @else {
              <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span class="text-amber-600 dark:text-amber-400">Требуется загрузить: {{ _stats().missing }}</span>
            }
          </div>
        </div>
      </div>

      <!-- Document Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        @for (cat of _categories; track cat.id) {
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div class="space-y-3">
              <div class="flex items-start justify-between gap-3">
                <div class="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/50 dark:border-blue-900/50">
                  <mat-icon svgIcon="file-contract" class="!w-5 !h-5" />
                </div>
                <div class="flex flex-col items-end">
                  @if (_status(cat.id) === 'checking') {
                    <div class="flex items-center gap-1 text-[11px] text-slate-400">
                      <mat-spinner diameter="14" />
                      <span>Проверка…</span>
                    </div>
                  } @else if (_status(cat.id) === 'uploaded') {
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      PDF загружен
                    </span>
                  } @else {
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                      <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      Файл отсутствует
                    </span>
                  }
                  <span class="text-[10px] text-slate-400 font-mono mt-1">{{ cat.lawReference }}</span>
                </div>
              </div>

              <div>
                <h3 class="font-bold text-slate-900 dark:text-white text-sm">{{ cat.title }}</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {{ cat.description }}
                </p>
              </div>
            </div>

            <div class="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <div class="text-[11px] text-slate-400 font-mono">
                public/legal/{{ cat.id }}.pdf
              </div>

              <div class="flex items-center gap-2">
                @if (_status(cat.id) === 'uploaded') {
                  <app-button
                    variant="outline"
                    size="sm"
                    icon="file-contract"
                    (click)="_view(cat.id)"
                  >
                    Открыть
                  </app-button>
                }
                <app-button
                  variant="primary"
                  size="sm"
                  icon="upload"
                  [disabled]="_uploadingId() === cat.id"
                  [loading]="_uploadingId() === cat.id"
                  (click)="_pickFile(cat.id)"
                >
                  {{ _uploadingId() === cat.id ? 'Загрузка…' : (_status(cat.id) === 'uploaded' ? 'Заменить' : 'Загрузить') }}
                </app-button>
              </div>
            </div>
          </div>
        }
      </div>

      <input #fileInput type="file" accept=".pdf,application/pdf" class="hidden" (change)="_onFile($event)" />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LegalDocsEditorComponent {
  protected readonly _ref = inject(MatDialogRef<LegalDocsEditorComponent>, { optional: true });
  private readonly _files = inject(AppFilesStorageService);
  private readonly _snack = inject(MatSnackBar);

  protected readonly _categories = LEGAL_CATEGORIES;
  protected readonly _statuses = signal<Record<LegalDocId, LegalDocStatus>>({
    offer: 'checking',
    pdn: 'checking',
    consent: 'checking',
    'consent-distribution': 'checking',
    cookies: 'checking'
  });
  protected readonly _uploadingId = signal<LegalDocId | null>(null);
  private readonly _fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');
  private _pendingId: LegalDocId | null = null;

  protected readonly _stats = computed(() => {
    const statuses = this._statuses();
    const list = Object.values(statuses);
    const uploaded = list.filter((s) => s === 'uploaded').length;
    const missing = list.filter((s) => s === 'missing').length;
    return {
      total: list.length,
      uploaded,
      missing
    };
  });

  constructor() {
    void this._loadStatuses();
  }

  protected async _loadStatuses(): Promise<void> {
    let docs: Awaited<ReturnType<typeof legalListLegalDocuments>>['data'] | null = null;
    try {
      docs = await apiCall(() => legalListLegalDocuments());
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : 'Не удалось получить список документов';
      this._snack.open(`${msg}. Проверьте, что бэкенд обновлён`, 'OK', { duration: 6000 });
    }
    this._statuses.update((s) => {
      const next = { ...s };
      for (const cat of LEGAL_CATEGORIES) {
        const d = docs?.find((x) => x.id === cat.id);
        next[cat.id] = d?.available ? 'uploaded' : 'missing';
      }
      return next;
    });
  }

  protected _status(id: LegalDocId): LegalDocStatus {
    return this._statuses()[id];
  }

  protected _pickFile(id: LegalDocId): void {
    this._pendingId = id;
    this._fileInput().nativeElement.click();
  }

  protected _view(id: LegalDocId): void {
    window.open(`${API_BASE}/api/v1/legal/documents/${id}/file`, '_blank', 'noopener');
  }

  protected async _onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    const id = this._pendingId;
    if (!file || !id) return;
    this._uploadingId.set(id);
    const expectedKey = `public/legal/${id}.pdf`;
    try {
      const path = await new Promise<string>((resolve, reject) => {
        this._files.uploadFile(expectedKey, file).subscribe({
          next: resolve,
          error: reject
        });
      });
      const docs = await apiCall(() => legalListLegalDocuments()).catch(() => null);
      const available = !!docs?.find((d) => d.id === id)?.available;
      if (available) {
        this._statuses.update((s) => ({ ...s, [id]: 'uploaded' }));
        this._snack.open('Файл загружен', 'Закрыть', { duration: 3000 });
        return;
      }
      const detail =
        typeof path === 'string'
          ? `сервер сохранил его как «${path}», но не видит по ключу legal/${id}.pdf`
          : `конструктор подключён к ${API_BASE}, и этот бэкенд не обновлён (нужен роутер /legal)`;
      this._statuses.update((s) => ({ ...s, [id]: 'missing' }));
      this._snack.open(
        `Файл не подтверждён сервером: ${detail}. Загрузите через dev-конструктор (ng serve → localhost) или обновите бэкенд`,
        'Закрыть',
        { duration: 12000 }
      );
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : 'Не удалось загрузить файл';
      this._snack.open(msg, 'Закрыть', { duration: 5000 });
      this._statuses.update((s) => ({ ...s, [id]: 'missing' }));
    } finally {
      this._uploadingId.set(null);
      this._pendingId = null;
    }
  }
}
