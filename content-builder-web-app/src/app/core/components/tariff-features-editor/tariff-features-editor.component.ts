import { ChangeDetectionStrategy, Component, computed, inject, Injectable, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltip } from '@angular/material/tooltip';
import { AppTariffFeaturesStorageService } from '@/core/api';
import { ApiError } from '@/core/api/api-utils';
import type { TariffFeatureCreate, TariffFeatureOut } from '@/core/api/generated/types.gen';
import { AppDialogWrapperComponent } from '../dialog-wrapper/dialog-wrapper.component';
import { AppDialogService } from '@/core/services/app-dialog.service';
import {
  AppButtonComponent,
  AppIconButtonComponent,
  AppInputComponent,
  AppTextareaComponent,
  AppCheckboxComponent,
  AppBadgeComponent
} from '@/core/components/ui';

@Injectable({ providedIn: 'root' })
export class TariffFeaturesEditorService {
  private readonly _dialogs = inject(MatDialog);

  public open(): MatDialogRef<TariffFeaturesEditorComponent> {
    return this._dialogs.open(TariffFeaturesEditorComponent, {
      width: '720px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      hasBackdrop: true,
      autoFocus: true
    });
  }
}

@Component({
  selector: 'app-tariff-feature-edit-dialog',
  imports: [
    ReactiveFormsModule,
    AppInputComponent,
    AppTextareaComponent,
    AppCheckboxComponent,
    AppDialogWrapperComponent
  ],
  template: `
    <app-dialog-wrapper
      [title]="_data ? 'Редактировать особенность' : 'Новая особенность тарифа'"
      [subtitle]="'Элемент списка «Что входит» на витрине тарифов'"
      [saveDisabled]="_form.invalid"
      (save)="_save()"
      (close)="_ref.close()"
    >
      <form class="flex flex-col gap-3 min-w-[300px]" [formGroup]="_form">
        <app-input
          label="Код ( латиницей, для интеграций )"
          formControlName="code"
          [required]="true"
        />
        <app-textarea
          label="Описание (как увидит обучающийся)"
          formControlName="description"
          [rows]="2"
          [required]="true"
        />
        <div class="flex gap-2 items-center">
          <app-input label="Порядок сортировки" type="number" formControlName="sortOrder" class="grow" />
          <app-checkbox formControlName="isActive" label="Активна" />
        </div>
      </form>
    </app-dialog-wrapper>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TariffFeatureEditDialogComponent {
  protected readonly _data = inject<TariffFeatureOut | null>(MAT_DIALOG_DATA);
  protected readonly _ref = inject(MatDialogRef<TariffFeatureEditDialogComponent, TariffFeatureCreate | null>);

  protected readonly _form = new FormGroup({
    code: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    sortOrder: new FormControl(0, { nonNullable: true }),
    isActive: new FormControl(true, { nonNullable: true })
  });

  constructor() {
    if (this._data) {
      this._form.reset({
        code: this._data.code,
        description: this._data.description,
        sortOrder: this._data.sortOrder,
        isActive: this._data.isActive
      });
    }
  }

  protected _save(): void {
    if (this._form.invalid) return;
    const v = this._form.getRawValue();
    this._ref.close({
      code: v.code.trim(),
      description: v.description.trim(),
      sortOrder: Number(v.sortOrder),
      isActive: v.isActive
    });
  }
}

@Component({
  selector: 'app-tariff-features-editor',
  imports: [
    FormsModule,
    MatDialogModule,
    MatTableModule,
    MatIcon,
    MatSnackBarModule,
    AppButtonComponent,
    AppIconButtonComponent,
    AppInputComponent,
    AppBadgeComponent
  ],
  templateUrl: './tariff-features-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TariffFeaturesEditorComponent {
  private readonly _storage = inject(AppTariffFeaturesStorageService);
  private readonly _dialogsService = inject(AppDialogService);
  private readonly _snack = inject(MatSnackBar);
  protected readonly _ref = inject(MatDialogRef<TariffFeaturesEditorComponent>, { optional: true });

  protected readonly _features = signal<TariffFeatureOut[]>([]);
  protected readonly _loading = signal(true);
  protected readonly _searchQuery = signal('');

  protected readonly _filteredFeatures = computed(() => {
    const q = this._searchQuery().trim().toLowerCase();
    const list = this._features();
    if (!q) return list;
    return list.filter(
      (f) => f.code.toLowerCase().includes(q) || f.description.toLowerCase().includes(q)
    );
  });

  constructor() {
    this._reload();
  }

  protected _close(): void {
    this._ref?.close();
  }

  protected _reload(): void {
    this._loading.set(true);
    this._storage.listAll().subscribe({
      next: (list) => {
        this._features.set([...list].sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code)));
        this._loading.set(false);
      },
      error: (err: unknown) => {
        this._loading.set(false);
        this._toast(err);
      }
    });
  }

  protected _create(): void {
    this._dialogsService
      .open(TariffFeatureEditDialogComponent, { data: null, width: '480px' })
      .afterClosed()
      .subscribe((body: TariffFeatureCreate | null | undefined) => {
        if (!body) return;
        this._storage.create(body).subscribe({
          next: () => this._reload(),
          error: (err) => this._toast(err)
        });
      });
  }

  protected _edit(f: TariffFeatureOut): void {
    this._dialogsService
      .open(TariffFeatureEditDialogComponent, { data: f, width: '480px' })
      .afterClosed()
      .subscribe((body: TariffFeatureCreate | null | undefined) => {
        if (!body) return;
        this._storage.update(f.id, body).subscribe({
          next: () => this._reload(),
          error: (err) => this._toast(err)
        });
      });
  }

  protected _delete(f: TariffFeatureOut): void {
    if (!confirm(`Удалить особенность «${f.description}»? Она будет убрана из всех тарифов.`)) return;
    this._storage.delete(f.id).subscribe({
      next: () => this._reload(),
      error: (err) => this._toast(err)
    });
  }

  private _toast(err: unknown): void {
    const msg = err instanceof ApiError ? err.detail : 'Ошибка запроса';
    this._snack.open(msg, 'Закрыть', { duration: 5000 });
  }
}
