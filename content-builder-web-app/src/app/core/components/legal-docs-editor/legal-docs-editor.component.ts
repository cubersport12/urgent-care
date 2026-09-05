import { ChangeDetectionStrategy, Component, ElementRef, inject, Injectable, signal, viewChild } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltip } from '@angular/material/tooltip';
import { AppFilesStorageService } from '@/core/api';
import { ApiError, apiCall } from '@/core/api/api-utils';
import { API_BASE } from '@/core/api/api-client';
import { legalListLegalDocuments } from '@/core/api/generated/sdk.gen';

type LegalDocId = 'offer' | 'pdn' | 'consent' | 'cookies';
type LegalDocStatus = 'checking' | 'missing' | 'uploaded';

const LEGAL_CATEGORIES: { id: LegalDocId; title: string }[] = [
  { id: 'offer', title: 'Пользовательское соглашение (оферта)' },
  { id: 'pdn', title: 'Политика обработки персональных данных' },
  { id: 'consent', title: 'Согласие на обработку персональных данных' },
  { id: 'cookies', title: 'Правила использования cookie' }
];

@Injectable({ providedIn: 'root' })
export class LegalDocsEditorService {
  private readonly _dialogs = inject(MatDialog);

  public open(): MatDialogRef<LegalDocsEditorComponent> {
    return this._dialogs.open(LegalDocsEditorComponent, {
      width: '560px',
      maxWidth: '95vw',
      hasBackdrop: true
    });
  }
}

@Component({
  selector: 'app-legal-docs-editor',
  imports: [
    MatDialogModule,
    MatButton,
    MatIcon,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltip
  ],
  template: `
    <h2 mat-dialog-title>
      Нормативные документы
      <span class="block text-xs font-normal text-slate-500 mt-1">
        PDF-файлы. Пользователи видят их без авторизации (экран регистрации и профиль).
      </span>
    </h2>
    <mat-dialog-content>
      <div class="flex flex-col gap-3 min-w-[380px] py-1">
        @for (cat of _categories; track cat.id) {
          <div class="flex items-center gap-3">
            <mat-icon svgIcon="file-contract" class="text-slate-400" />
            <div class="grow min-w-0">
              <div class="text-sm truncate">{{ cat.title }}</div>
              <div class="text-xs" [class]="_statusClass(cat.id)">
                {{ _statusLabel(cat.id) }}
              </div>
            </div>
            @if (_status(cat.id) === 'checking') {
              <mat-spinner diameter="22" />
            } @else {
              <button
                mat-stroked-button
                type="button"
                [disabled]="_uploadingId() === cat.id"
                (click)="_pickFile(cat.id)"
              >
                {{ _uploadingId() === cat.id ? 'Загрузка…' : 'Загрузить' }}
              </button>
            }
          </div>
        }
      </div>
      <input #fileInput type="file" accept=".pdf,application/pdf" class="hidden"
             (change)="_onFile($event)" />
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="_ref.close()">Закрыть</button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LegalDocsEditorComponent {
  protected readonly _ref = inject(MatDialogRef<LegalDocsEditorComponent>);
  private readonly _files = inject(AppFilesStorageService);
  private readonly _snack = inject(MatSnackBar);

  protected readonly _categories = LEGAL_CATEGORIES;
  protected readonly _statuses = signal<Record<LegalDocId, LegalDocStatus>>({
    offer: 'checking',
    pdn: 'checking',
    consent: 'checking',
    cookies: 'checking'
  });
  protected readonly _uploadingId = signal<LegalDocId | null>(null);
  private readonly _fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');
  private _pendingId: LegalDocId | null = null;

  constructor() {
    void this._loadStatuses();
  }

  private async _loadStatuses(): Promise<void> {
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

  protected _statusLabel(id: LegalDocId): string {
    switch (this._status(id)) {
      case 'uploaded': return 'файл загружен (PDF)';
      case 'missing': return 'файл не загружен';
      case 'checking': return 'проверка…';
    }
  }

  protected _statusClass(id: LegalDocId): string {
    return this._status(id) === 'uploaded' ? 'text-emerald-600' : 'text-slate-400';
  }

  protected _pickFile(id: LegalDocId): void {
    this._pendingId = id;
    this._fileInput().nativeElement.click();
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
      // uploadFile возвращает Observable — подпиской превращаем в Promise
      const path = await new Promise<string>((resolve, reject) => {
        this._files.uploadFile(expectedKey, file).subscribe({
          next: resolve,
          error: reject
        });
      });
      // Подтверждаем с сервера, что файл реально доступен по ожидаемому ключу
      const docs = await apiCall(() => legalListLegalDocuments()).catch(() => null);
      const available = !!docs?.find((d) => d.id === id)?.available;
      if (available) {
        this._statuses.update((s) => ({ ...s, [id]: 'uploaded' }));
        this._snack.open('Файл загружен', 'OK', { duration: 3000 });
        return;
      }
      // Файл принят, но ответ/проверка не сходятся — почти наверняка
      // конструктор подключён к необновлённому бэкенду
      const detail =
        typeof path === 'string'
          ? `сервер сохранил его как «${path}», но не видит по ключу legal/${id}.pdf`
          : `конструктор подключён к ${API_BASE}, и этот бэкенд не обновлён (нужен роутер /legal)`;
      this._statuses.update((s) => ({ ...s, [id]: 'missing' }));
      this._snack.open(
        `Файл не подтверждён сервером: ${detail}. Загрузите через dev-конструктор (ng serve → localhost) или обновите бэкенд`,
        'OK',
        { duration: 12000 },
      );
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : 'Не удалось загрузить файл';
      this._snack.open(msg, 'OK', { duration: 5000 });
      this._statuses.update((s) => ({ ...s, [id]: 'missing' }));
    } finally {
      this._uploadingId.set(null);
      this._pendingId = null;
    }
  }
}
