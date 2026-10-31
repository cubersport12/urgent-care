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
import { AppTariffFeaturesStorageService, AppTariffsStorageService } from '@/core/api';
import { ApiError } from '@/core/api/api-utils';
import type {
  TariffCreate,
  TariffFeatureStateOut,
  TariffOut
} from '@/core/api/generated/types.gen';
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
export class TariffsEditorService {
  private readonly _dialogs = inject(MatDialog);

  public open(): MatDialogRef<TariffsEditorComponent> {
    return this._dialogs.open(TariffsEditorComponent, {
      width: '720px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      hasBackdrop: true,
      autoFocus: true
    });
  }
}

@Component({
  selector: 'app-tariff-edit-dialog',
  imports: [
    ReactiveFormsModule,
    AppInputComponent,
    AppTextareaComponent,
    AppCheckboxComponent,
    AppDialogWrapperComponent
  ],
  template: `
    <app-dialog-wrapper
      [title]="_data ? 'Редактировать тариф' : 'Новый тарифный план'"
      [subtitle]="_data ? 'Настройка цен и параметров доступа' : 'Создание тарифа для витрины обучающихся'"
      [saveDisabled]="_form.invalid"
      (save)="_save()"
      (close)="_ref.close()"
    >
      <form class="flex flex-col gap-3 min-w-[300px]" [formGroup]="_form">
        <app-input label="Код тарифа" formControlName="code" [required]="true" />
        <app-input label="Название тарифа" formControlName="title" [required]="true" />
        <app-textarea label="Описание" formControlName="description" [rows]="2" />
        <div class="flex flex-col gap-1.5">
          <span class="text-xs font-medium text-slate-500 dark:text-slate-400">Что входит в тариф</span>
          <div class="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
            @for (f of _featureStates(); track f.id) {
              <label class="flex items-center gap-2 text-sm cursor-pointer select-none" [class.opacity-50]="!f.isActive">
                <input
                  type="checkbox"
                  class="h-4 w-4 accent-blue-600"
                  [checked]="_form.controls.featureIds.value.includes(f.id)"
                  (change)="_toggleFeature(f.id, $event)"
                />
                <span class="text-slate-700 dark:text-slate-200">{{ f.description }}</span>
                @if (!f.isActive) {
                  <span class="text-xs text-slate-400">(неактивна)</span>
                }
              </label>
            } @empty {
              <span class="text-xs text-slate-400">Особенности не заведены — добавьте их в разделе «Особенности тарифов»</span>
            }
          </div>
        </div>
        <div class="flex gap-2">
          <app-input label="Цена, ₽" type="number" formControlName="priceRub" class="grow" [required]="true" />
          <app-input label="Период, дней" type="number" formControlName="periodDays" class="grow" [required]="true" />
        </div>
        <div class="flex gap-2">
          <app-input label="Ранг тарифа" type="number" formControlName="rank" class="grow" [required]="true" />
          <app-input label="Порядок сортировки" type="number" formControlName="sortOrder" class="grow" />
        </div>
        <app-input
          label="RuStore: код продукта-подписки (productId из консоли RuStore)"
          formControlName="rustoreProductId"
        />
        <fieldset class="flex flex-col gap-2">
          <legend class="text-sm font-medium">Цвет карточки профиля</legend>
          <app-checkbox formControlName="colorEnabled" label="Выделять карточку цветом тарифа" />
          @if (_form.controls.colorEnabled.value) {
            <label class="flex items-center gap-3 text-sm">Цвет <input type="color" formControlName="effectColor" aria-label="Цвет карточки тарифа" /></label>
          }
        </fieldset>
        <app-checkbox formControlName="isActive" label="Активен на витрине" />
        <app-checkbox formControlName="isDefault" label="Тариф по умолчанию (бесплатный)" />
      </form>
    </app-dialog-wrapper>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TariffEditDialogComponent {
  private readonly _featuresStorage = inject(AppTariffFeaturesStorageService);
  protected readonly _data = inject<TariffOut | null>(MAT_DIALOG_DATA);
  protected readonly _ref = inject(MatDialogRef<TariffEditDialogComponent, TariffCreate | null>);

  /** Каталог особенностей для чекбоксов: у существующего тарифа — из TariffOut, у нового — из справочника. */
  protected readonly _featureStates = signal<TariffFeatureStateOut[]>([]);

  protected readonly _form = new FormGroup({
    code: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl<string | null>(null),
    priceRub: new FormControl(0, { nonNullable: true, validators: [Validators.required] }),
    periodDays: new FormControl(30, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
    effectColor: new FormControl('#d4a633', { nonNullable: true }),
    colorEnabled: new FormControl(false, { nonNullable: true }),
    rank: new FormControl(0, { nonNullable: true, validators: [Validators.required] }),
    sortOrder: new FormControl(0, { nonNullable: true }),
    rustoreProductId: new FormControl<string | null>(null),
    isActive: new FormControl(true, { nonNullable: true }),
    isDefault: new FormControl(false, { nonNullable: true }),
    featureIds: new FormControl<string[]>([], { nonNullable: true })
  });

  constructor() {
    if (this._data) {
      this._featureStates.set(this._data.features ?? []);
      this._form.reset({
        code: this._data.code,
        title: this._data.title,
        description: this._data.description ?? null,
        priceRub: this._data.priceRub,
        periodDays: this._data.periodDays,
        rank: this._data.rank,
        effectColor: this._data.effectColor ?? '#d4a633',
        colorEnabled: !!this._data.effectColor,
        sortOrder: this._data.sortOrder,
        rustoreProductId: this._data.rustoreProductId ?? null,
        isActive: this._data.isActive,
        isDefault: this._data.isDefault,
        featureIds: (this._data.features ?? []).filter((f) => f.included).map((f) => f.id)
      });
    } else {
      this._featuresStorage.listAll().subscribe((list) =>
        this._featureStates.set(list.map((f) => ({ ...f, included: false })))
      );
    }
  }

  protected _toggleFeature(id: string, ev: Event): void {
    const checked = (ev.target as HTMLInputElement).checked;
    const selected = new Set(this._form.controls.featureIds.value);
    if (checked) selected.add(id);
    else selected.delete(id);
    this._form.controls.featureIds.setValue([...selected]);
  }

  protected _save(): void {
    if (this._form.invalid) return;
    const v = this._form.getRawValue();
    this._ref.close({
      code: v.code.trim(),
      title: v.title.trim(),
      description: v.description?.trim() || null,
      priceRub: Number(v.priceRub),
      periodDays: Number(v.periodDays),
      rank: Number(v.rank),
      effectColor: v.colorEnabled ? v.effectColor : null,
      glowEffect: 'none',
      sortOrder: Number(v.sortOrder),
      rustoreProductId: v.rustoreProductId?.trim() || null,
      isActive: v.isActive,
      isDefault: v.isDefault,
      featureIds: v.featureIds
    });
  }
}

@Component({
  selector: 'app-tariffs-editor',
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
  templateUrl: './tariffs-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TariffsEditorComponent {
  private readonly _storage = inject(AppTariffsStorageService);
  private readonly _dialogsService = inject(AppDialogService);
  private readonly _snack = inject(MatSnackBar);
  protected readonly _ref = inject(MatDialogRef<TariffsEditorComponent>, { optional: true });

  protected readonly _tariffs = signal<TariffOut[]>([]);
  protected readonly _loading = signal(true);
  protected readonly _searchQuery = signal('');

  protected readonly _filteredTariffs = computed(() => {
    const q = this._searchQuery().trim().toLowerCase();
    const list = this._tariffs();
    if (!q) return list;
    return list.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  });

  protected readonly _stats = computed(() => {
    const list = this._tariffs();
    const active = list.filter((t) => t.isActive).length;
    const defaultTariff = list.find((t) => t.isDefault)?.title ?? 'Не назначен';
    const maxPrice = list.reduce((max, t) => Math.max(max, t.priceRub), 0);
    return {
      total: list.length,
      active,
      defaultTariff,
      maxPrice: maxPrice ? `${maxPrice.toLocaleString('ru-RU')} ₽` : '0 ₽'
    };
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
        this._tariffs.set([...list].sort((a, b) => a.sortOrder - b.sortOrder || a.rank - b.rank));
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
      .open(TariffEditDialogComponent, { data: null, width: '480px' })
      .afterClosed()
      .subscribe((body: TariffCreate | null | undefined) => {
        if (!body) return;
        this._storage.create(body).subscribe({
          next: () => this._reload(),
          error: (err) => this._toast(err)
        });
      });
  }

  protected _edit(t: TariffOut): void {
    this._dialogsService
      .open(TariffEditDialogComponent, { data: t, width: '480px' })
      .afterClosed()
      .subscribe((body: TariffCreate | null | undefined) => {
        if (!body) return;
        this._storage.update(t.id, body).subscribe({
          next: () => this._reload(),
          error: (err) => this._toast(err)
        });
      });
  }

  protected _delete(t: TariffOut): void {
    if (t.isDefault) {
      this._snack.open('Нельзя удалить тариф по умолчанию', 'Закрыть', { duration: 4000 });
      return;
    }
    if (!confirm(`Удалить тариф «${t.title}»?`)) return;
    this._storage.delete(t.id).subscribe({
      next: () => this._reload(),
      error: (err) => this._toast(err)
    });
  }

  private _toast(err: unknown): void {
    const msg = err instanceof ApiError ? err.detail : 'Ошибка запроса';
    this._snack.open(msg, 'Закрыть', { duration: 5000 });
  }
}
