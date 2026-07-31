import { ChangeDetectionStrategy, Component, inject, Injectable, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { AppTariffsStorageService } from '@/core/api';
import { ApiError } from '@/core/api/api-utils';
import type { TariffCreate, TariffOut } from '@/core/api/generated/types.gen';

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
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckbox,
    MatButton,
    MatIcon
  ],
  template: `
    <h2 mat-dialog-title>{{ _data ? 'Редактировать тариф' : 'Новый тариф' }}</h2>
    <mat-dialog-content>
      <form class="flex flex-col gap-2 pt-2 min-w-[280px]" [formGroup]="_form">
        <mat-form-field appearance="fill">
          <mat-label>Код</mat-label>
          <input matInput formControlName="code" />
        </mat-form-field>
        <mat-form-field appearance="fill">
          <mat-label>Название</mat-label>
          <input matInput formControlName="title" />
        </mat-form-field>
        <mat-form-field appearance="fill">
          <mat-label>Описание</mat-label>
          <textarea matInput formControlName="description" rows="2"></textarea>
        </mat-form-field>
        <div class="flex gap-2">
          <mat-form-field appearance="fill" class="grow">
            <mat-label>Цена, ₽</mat-label>
            <input matInput type="number" formControlName="priceRub" />
          </mat-form-field>
          <mat-form-field appearance="fill" class="grow">
            <mat-label>Период, дней</mat-label>
            <input matInput type="number" formControlName="periodDays" />
          </mat-form-field>
        </div>
        <div class="flex gap-2">
          <mat-form-field appearance="fill" class="grow">
            <mat-label>Ранг</mat-label>
            <input matInput type="number" formControlName="rank" />
          </mat-form-field>
          <mat-form-field appearance="fill" class="grow">
            <mat-label>Порядок</mat-label>
            <input matInput type="number" formControlName="sortOrder" />
          </mat-form-field>
        </div>
        <mat-checkbox formControlName="isActive">Активен</mat-checkbox>
        <mat-checkbox formControlName="isDefault">По умолчанию (бесплатный)</mat-checkbox>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="_ref.close()">Отмена</button>
      <button mat-flat-button color="primary" type="button" [disabled]="_form.invalid" (click)="_save()">
        <mat-icon svgIcon="check" />
        Сохранить
      </button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TariffEditDialogComponent {
  protected readonly _data = inject<TariffOut | null>(MAT_DIALOG_DATA);
  protected readonly _ref = inject(MatDialogRef<TariffEditDialogComponent, TariffCreate | null>);

  protected readonly _form = new FormGroup({
    code: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl<string | null>(null),
    priceRub: new FormControl(0, { nonNullable: true, validators: [Validators.required] }),
    periodDays: new FormControl(30, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
    rank: new FormControl(0, { nonNullable: true, validators: [Validators.required] }),
    sortOrder: new FormControl(0, { nonNullable: true }),
    isActive: new FormControl(true, { nonNullable: true }),
    isDefault: new FormControl(false, { nonNullable: true })
  });

  constructor() {
    if (this._data) {
      this._form.reset({
        code: this._data.code,
        title: this._data.title,
        description: this._data.description ?? null,
        priceRub: this._data.priceRub,
        periodDays: this._data.periodDays,
        rank: this._data.rank,
        sortOrder: this._data.sortOrder,
        isActive: this._data.isActive,
        isDefault: this._data.isDefault
      });
    }
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
      sortOrder: Number(v.sortOrder),
      isActive: v.isActive,
      isDefault: v.isDefault
    });
  }
}

@Component({
  selector: 'app-tariffs-editor',
  imports: [
    MatDialogModule,
    MatTableModule,
    MatButton,
    MatIconButton,
    MatIcon,
    MatTooltip,
    MatSnackBarModule
  ],
  templateUrl: './tariffs-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TariffsEditorComponent {
  private readonly _storage = inject(AppTariffsStorageService);
  private readonly _dialogs = inject(MatDialog);
  private readonly _snack = inject(MatSnackBar);
  private readonly _ref = inject(MatDialogRef<TariffsEditorComponent>);

  protected readonly _tariffs = signal<TariffOut[]>([]);
  protected readonly _loading = signal(true);
  protected readonly _columns = ['title', 'code', 'price', 'rank', 'flags', 'actions'];

  constructor() {
    this._reload();
  }

  protected _close(): void {
    this._ref.close();
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
    this._dialogs
      .open(TariffEditDialogComponent, { data: null, width: '420px' })
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
    this._dialogs
      .open(TariffEditDialogComponent, { data: t, width: '420px' })
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
      this._snack.open('Нельзя удалить тариф по умолчанию', 'OK', { duration: 4000 });
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
    this._snack.open(msg, 'OK', { duration: 5000 });
  }
}
