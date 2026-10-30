import { ChangeDetectionStrategy, Component, inject, Injectable, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { Store } from '@ngxs/store';
import { AppFolderVm, generateGUID } from '@/core/utils';
import { AppFilesStorageService } from '@/core/api';
import { forkJoin, of, switchMap } from 'rxjs';
import { FoldersActions } from '@/core/store';
import { RewardSelectComponent } from '../reward-select/reward-select.component';
import { TariffSelectComponent } from '../tariff-select/tariff-select.component';
import { AppDialogWrapperComponent } from '../dialog-wrapper/dialog-wrapper.component';
import { AppDialogService } from '@/core/services/app-dialog.service';
import { AppButtonComponent, AppCheckboxComponent, AppIconButtonComponent, AppInputComponent } from '../ui';

type FolderImageFieldKey = 'iconPath' | 'backgroundPath' | 'iconPathDark' | 'backgroundPathDark';

@Injectable({ providedIn: 'root' })
export class FolderPropertiesService {
  private readonly _dialogs = inject(AppDialogService);

  public open(folder: AppFolderVm): MatDialogRef<FolderPropertiesComponent> {
    return this._dialogs.open(FolderPropertiesComponent, {
      width: '920px',
      data: folder,
      hasBackdrop: true,
      autoFocus: true
    });
  }
}

@Component({
  selector: 'app-folder-properties',
  imports: [
    ReactiveFormsModule,
    MatIcon,
    TariffSelectComponent,
    RewardSelectComponent,
    AppDialogWrapperComponent,
    AppInputComponent,
    AppCheckboxComponent,
    AppButtonComponent,
    AppIconButtonComponent
  ],
  template: `
    <app-dialog-wrapper
      title="Свойства папки"
      [subtitle]="_data.name"
      [saveDisabled]="_form.invalid || !_form.dirty || _uploading() || _validating() > 0"
      (save)="_save()"
      (close)="_ref.close()"
    >
      <form class="grid grid-cols-[minmax(0,1fr)_400px] gap-4 items-start" [formGroup]="_form">
        <!-- Левая колонка: свойства, доступ, награда -->
        <div class="flex flex-col gap-4 min-w-0">
          <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 space-y-3">
            <div class="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <mat-icon svgIcon="folder" class="!w-4 !h-4 text-amber-500" />
              Основные сведения
            </div>
            <app-input
              label="Наименование папки"
              formControlName="name"
              placeholder="Например: Педиатрия и неотложные состояния"
              [required]="true"
            />
            <app-checkbox formControlName="showRandomOpen" label="Добавить кнопку «Открыть случайно»" />
          </div>

          <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 space-y-3">
            <div class="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <mat-icon svgIcon="tag" class="!w-4 !h-4 text-blue-500" />
              Доступ и тариф
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 m-0">
              Минимальный тариф для открытия папки и её содержимого.
            </p>
            <app-tariff-select [control]="_form.controls.requiredTariffId" />
          </div>

          <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 space-y-3">
            <div class="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <mat-icon svgIcon="trophy" class="!w-4 !h-4 text-amber-500" />
              Награда за прохождение
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 m-0">
              Выдаётся за изучение всех материалов папки.
            </p>
            <app-reward-select [control]="_form.controls.requiredRewardId" />
          </div>
        </div>

        <!-- Правая колонка: изображения по темам -->
        <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 flex flex-col gap-3">
          <div class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Изображения папки</div>
          <p class="text-xs text-slate-500 dark:text-slate-400 m-0">PNG. Если тёмное изображение не задано, используется светлое.</p>
          @for (group of _imageGroups; track group.label) {
            <div class="space-y-2">
              <div class="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <mat-icon [svgIcon]="group.icon" class="!w-3.5 !h-3.5 text-slate-400" />
                {{ group.label }}
              </div>
              <div class="grid grid-cols-2 gap-3">
                @for (field of group.fields; track field.key) {
                  <div class="space-y-1.5">
                    <div class="text-sm font-medium">{{ field.label }}</div>
                    @if (_previews()[field.key]) {
                      <img
                        [src]="_previews()[field.key]"
                        [alt]="group.label + ' · ' + field.label"
                        class="h-20 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white object-contain"
                      />
                    } @else {
                      <div class="h-20 w-full rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 grid place-items-center text-[11px] text-slate-400">
                        Нет изображения
                      </div>
                    }
                    <div class="flex items-center gap-1">
                      <input #picker type="file" accept="image/png,.png" class="hidden" (change)="_onFile(field.key, $event)" />
                      <app-button
                        variant="outline"
                        size="sm"
                        icon="upload"
                        [disabled]="_uploading() || _validating() > 0"
                        (clicked)="picker.click()"
                      >
                        {{ _form.controls[field.key].value || _filesToUpload[field.key] ? 'Заменить' : 'Загрузить' }}
                      </app-button>
                      @if (_form.controls[field.key].value || _filesToUpload[field.key]) {
                        <app-icon-button
                          icon="trash"
                          size="sm"
                          variant="ghost"
                          tooltip="Удалить"
                          [disabled]="_uploading()"
                          (clicked)="_clearImage(field.key)"
                        />
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          }
          @if (_uploading()) { <p class="text-sm m-0" role="status">Загрузка изображений…</p> }
          @if (_error()) { <p class="text-sm text-red-600 m-0" role="alert">{{ _error() }}</p> }
        </div>
      </form>
    </app-dialog-wrapper>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FolderPropertiesComponent {
  protected readonly _data = inject<AppFolderVm>(MAT_DIALOG_DATA);
  protected readonly _ref = inject(MatDialogRef<FolderPropertiesComponent>);
  private readonly _store = inject(Store);
  private readonly _files = inject(AppFilesStorageService);
  protected readonly _uploading = signal(false);
  protected readonly _error = signal('');
  protected readonly _validating = signal(0);
  protected readonly _previews = signal<Record<string, string>>({});
  private readonly _selectionVersion: Record<FolderImageFieldKey, number> = {
    iconPath: 0, backgroundPath: 0, iconPathDark: 0, backgroundPathDark: 0
  };
  protected readonly _filesToUpload: Partial<Record<FolderImageFieldKey, File>> = {};
  protected readonly _imageGroups = [
    {
      label: 'Светлая тема',
      icon: 'sun',
      fields: [
        { key: 'iconPath' as const, label: 'Иконка' },
        { key: 'backgroundPath' as const, label: 'Фон' }
      ]
    },
    {
      label: 'Тёмная тема',
      icon: 'moon',
      fields: [
        { key: 'iconPathDark' as const, label: 'Иконка' },
        { key: 'backgroundPathDark' as const, label: 'Фон' }
      ]
    }
  ];

  protected readonly _form = new FormGroup({
    iconPath: new FormControl<string | null>(this._data.iconPath ?? null),
    backgroundPath: new FormControl<string | null>(this._data.backgroundPath ?? null),
    iconPathDark: new FormControl<string | null>(this._data.iconPathDark ?? null),
    backgroundPathDark: new FormControl<string | null>(this._data.backgroundPathDark ?? null),
    name: new FormControl(this._data.name, { nonNullable: true, validators: [Validators.required] }),
    showRandomOpen: new FormControl(this._data.showRandomOpen ?? false, { nonNullable: true }),
    requiredTariffId: new FormControl<string | null>(this._data.requiredTariffId ?? null),
    requiredRewardId: new FormControl<string | null>(this._data.requiredRewardId ?? null)
  });

  constructor() {
    for (const group of this._imageGroups) {
      for (const { key } of group.fields) {
        const path = this._form.controls[key].value;
        if (path) this._files.downloadFile(path).subscribe({
          next: (blob) => { void this._preview(key, blob, path); },
          error: () => this._error.set('Не удалось загрузить предпросмотр изображения.')
        });
      }
    }
  }

  private async _preview(key: FolderImageFieldKey, blob: Blob, path?: string): Promise<void> {
    const reader = new FileReader();
    reader.onload = () => {
      if (path ? (this._form.controls[key].value !== path || this._filesToUpload[key]) : this._filesToUpload[key] !== blob) return;
      this._previews.update((previews) => ({ ...previews, [key]: String(reader.result) }));
    };
    reader.onerror = () => this._error.set('Не удалось показать предпросмотр изображения.');
    reader.readAsDataURL(blob);
  }

  protected async _onFile(key: FolderImageFieldKey, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const version = ++this._selectionVersion[key];
    let signature: Uint8Array;
    this._validating.update((count) => count + 1);
    try {
      signature = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    } catch {
      if (version === this._selectionVersion[key]) this._error.set('Не удалось прочитать файл.');
      return;
    } finally {
      this._validating.update((count) => count - 1);
    }
    if (version !== this._selectionVersion[key]) return;
    if (signature.length !== 8 || ![137, 80, 78, 71, 13, 10, 26, 10].every((value, i) => signature[i] === value)) {
      this._error.set('Выберите корректный PNG-файл.');
      return;
    }
    this._error.set('');
    this._filesToUpload[key] = file;
    this._form.markAsDirty();
    await this._preview(key, file);
  }

  protected _clearImage(key: FolderImageFieldKey): void {
    this._selectionVersion[key]++;
    delete this._filesToUpload[key];
    this._form.controls[key].setValue(null);
    this._form.markAsDirty();
    this._previews.update((previews) => ({ ...previews, [key]: '' }));
    this._error.set('');
  }

  protected _save(): void {
    if (this._form.invalid || this._uploading() || this._validating()) return;
    this._uploading.set(true);
    this._error.set('');
    const upload = (key: FolderImageFieldKey) => {
      const file = this._filesToUpload[key];
      return file ? this._files.uploadFile(`public/folders/${generateGUID()}.png`, new Blob([file], { type: 'image/png' })) : of(this._form.controls[key].value);
    };
    forkJoin({
      iconPath: upload('iconPath'),
      backgroundPath: upload('backgroundPath'),
      iconPathDark: upload('iconPathDark'),
      backgroundPathDark: upload('backgroundPathDark')
    }).pipe(
      switchMap(({ iconPath, backgroundPath, iconPathDark, backgroundPathDark }) => this._store.dispatch(
        new FoldersActions.UpdateFolder(this._data.id, {
          ...this._form.getRawValue(), iconPath, backgroundPath, iconPathDark, backgroundPathDark
        })
      ))
    ).subscribe({
      next: () => this._ref.close(true),
      error: () => { this._uploading.set(false); this._error.set('Не удалось сохранить свойства папки. Попробуйте ещё раз.'); }
    });
  }
}
