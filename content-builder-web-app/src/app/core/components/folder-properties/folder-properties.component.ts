import { ChangeDetectionStrategy, Component, inject, Injectable, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Store } from '@ngxs/store';
import { AppFolderVm, generateGUID } from '@/core/utils';
import { AppFilesStorageService } from '@/core/api';
import { forkJoin, of, switchMap } from 'rxjs';
import { FoldersActions } from '@/core/store';
import { RewardSelectComponent } from '../reward-select/reward-select.component';
import { TariffSelectComponent } from '../tariff-select/tariff-select.component';
import { AppDialogWrapperComponent } from '../dialog-wrapper/dialog-wrapper.component';
import { AppDialogService } from '@/core/services/app-dialog.service';
import { AppCheckboxComponent, AppInputComponent } from '../ui';

@Injectable({ providedIn: 'root' })
export class FolderPropertiesService {
  private readonly _dialogs = inject(AppDialogService);

  public open(folder: AppFolderVm): MatDialogRef<FolderPropertiesComponent> {
    return this._dialogs.open(FolderPropertiesComponent, {
      width: '460px',
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
    AppCheckboxComponent
  ],
  template: `
    <app-dialog-wrapper
      title="Свойства папки"
      [subtitle]="_data.name"
      [saveDisabled]="_form.invalid || !_form.dirty || _uploading() || _validating() > 0"
      (save)="_save()"
      (close)="_ref.close()"
    >
      <form class="flex flex-col gap-4 min-w-[320px]" [formGroup]="_form">
        <!-- Main Info Card -->
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
          <div class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Изображения папки</div>
          @for (field of _imageFields; track field.key) {
            <div class="space-y-2">
              <label [for]="field.key" class="block text-sm font-medium">{{ field.label }} (PNG)</label>
              @if (_previews()[field.key]) {
                <img [src]="_previews()[field.key]" [alt]="field.label" class="max-h-28 max-w-full rounded-lg object-contain" />
              }
              <input [id]="field.key" type="file" accept="image/png,.png" [disabled]="_uploading()" (change)="_onFile(field.key, $event)" />
              @if (_form.controls[field.key].value || _filesToUpload[field.key]) {
                <button type="button" class="block text-sm text-red-600" [disabled]="_uploading()" (click)="_clearImage(field.key)">Удалить изображение</button>
              }
            </div>
          }
          @if (_uploading()) { <p class="text-sm" role="status">Загрузка изображений…</p> }
          @if (_error()) { <p class="text-sm text-red-600" role="alert">{{ _error() }}</p> }
        </div>

        <!-- Access Control Card -->
        <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 space-y-3">
          <div class="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <mat-icon svgIcon="tag" class="!w-4 !h-4 text-blue-500" />
            Доступ и тариф
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 m-0">
            Задайте минимальный тарифный план, требуемый пользователю для открытия папки и её содержимого.
          </p>
          <app-tariff-select [control]="_form.controls.requiredTariffId" />
        </div>

        <!-- Reward Card -->
        <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 space-y-3">
          <div class="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <mat-icon svgIcon="trophy" class="!w-4 !h-4 text-amber-500" />
            Награда за прохождение
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 m-0">
            Опциональная награда, которая выдается за изучение всех материалов данной папки.
          </p>
          <app-reward-select [control]="_form.controls.requiredRewardId" />
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
  private readonly _selectionVersion = { iconPath: 0, backgroundPath: 0 };
  protected readonly _filesToUpload: Partial<Record<'iconPath' | 'backgroundPath', File>> = {};
  protected readonly _imageFields = [
    { key: 'iconPath' as const, label: 'Иконка' },
    { key: 'backgroundPath' as const, label: 'Фон' }
  ];

  protected readonly _form = new FormGroup({
    iconPath: new FormControl<string | null>(this._data.iconPath ?? null),
    backgroundPath: new FormControl<string | null>(this._data.backgroundPath ?? null),
    name: new FormControl(this._data.name, { nonNullable: true, validators: [Validators.required] }),
    showRandomOpen: new FormControl(this._data.showRandomOpen ?? false, { nonNullable: true }),
    requiredTariffId: new FormControl<string | null>(this._data.requiredTariffId ?? null),
    requiredRewardId: new FormControl<string | null>(this._data.requiredRewardId ?? null)
  });

  constructor() {
    for (const { key } of this._imageFields) {
      const path = this._form.controls[key].value;
      if (path) this._files.downloadFile(path).subscribe({
        next: (blob) => { void this._preview(key, blob, path); },
        error: () => this._error.set('Не удалось загрузить предпросмотр изображения.')
      });
    }
  }

  private async _preview(key: 'iconPath' | 'backgroundPath', blob: Blob, path?: string): Promise<void> {
    const reader = new FileReader();
    reader.onload = () => {
      if (path ? (this._form.controls[key].value !== path || this._filesToUpload[key]) : this._filesToUpload[key] !== blob) return;
      this._previews.update((previews) => ({ ...previews, [key]: String(reader.result) }));
    };
    reader.onerror = () => this._error.set('Не удалось показать предпросмотр изображения.');
    reader.readAsDataURL(blob);
  }

  protected async _onFile(key: 'iconPath' | 'backgroundPath', event: Event): Promise<void> {
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

  protected _clearImage(key: 'iconPath' | 'backgroundPath'): void {
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
    const upload = (key: 'iconPath' | 'backgroundPath') => {
      const file = this._filesToUpload[key];
      return file ? this._files.uploadFile(`public/folders/${generateGUID()}.png`, new Blob([file], { type: 'image/png' })) : of(this._form.controls[key].value);
    };
    forkJoin({ iconPath: upload('iconPath'), backgroundPath: upload('backgroundPath') }).pipe(
      switchMap(({ iconPath, backgroundPath }) => this._store.dispatch(
        new FoldersActions.UpdateFolder(this._data.id, { ...this._form.getRawValue(), iconPath, backgroundPath })
      ))
    ).subscribe({
      next: () => this._ref.close(true),
      error: () => { this._uploading.set(false); this._error.set('Не удалось сохранить свойства папки. Попробуйте ещё раз.'); }
    });
  }
}
