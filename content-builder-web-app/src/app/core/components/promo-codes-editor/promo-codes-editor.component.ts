import { ChangeDetectionStrategy, Component, computed, inject, Injectable, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
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
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltip } from '@angular/material/tooltip';
import { AppPromoCodesStorageService, AppTariffsStorageService } from '@/core/api';
import { ApiError } from '@/core/api/api-utils';
import type { PromoCodeCreate, PromoCodeOut, PromoCodeUpdate, TariffOut } from '@/core/api/generated/types.gen';

type PromoDialogResult = PromoCodeCreate | PromoCodeUpdate;

@Injectable({ providedIn: 'root' })
export class PromoCodesEditorService {
  private readonly _dialogs = inject(MatDialog);

  public open(): MatDialogRef<PromoCodesEditorComponent> {
    return this._dialogs.open(PromoCodesEditorComponent, {
      width: '860px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      hasBackdrop: true,
      autoFocus: true
    });
  }
}

@Component({
  selector: 'app-promo-code-edit-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckbox,
    MatButton,
    MatIcon
  ],
  template: `
    <h2 mat-dialog-title>{{ _data ? 'Редактировать промокод' : 'Новый промокод' }}</h2>
    <mat-dialog-content>
      <form class="flex flex-col gap-2 pt-2 min-w-[300px]" [formGroup]="_form">
        <div class="flex items-end gap-2">
          <mat-form-field appearance="fill" class="grow">
            <mat-label>Код</mat-label>
            <input matInput formControlName="code" [readonly]="!!_data" class="font-mono" />
          </mat-form-field>
          @if (!_data) {
            <button type="button" mat-stroked-button (click)="_generate()" matTooltip="Сгенерировать случайный код">
              <mat-icon svgIcon="rotate-right" />
              Сгенерировать
            </button>
          }
        </div>
        <mat-form-field appearance="fill">
          <mat-label>Комментарий (только для админов)</mat-label>
          <input matInput formControlName="title" />
        </mat-form-field>
        <div class="flex gap-2">
          <mat-form-field appearance="fill" class="grow">
            <mat-label>Скидка, %</mat-label>
            <input matInput type="number" formControlName="discountPercent" min="1" max="99" />
            @if (_form.hasError('percentRange')) {
              <mat-error>От 1 до 99</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="fill" class="grow">
            <mat-label>Макс. активаций</mat-label>
            <input matInput type="number" formControlName="maxActivations" min="1" placeholder="без лимита" />
          </mat-form-field>
        </div>
        <mat-form-field appearance="fill">
          <mat-label>Тариф</mat-label>
          <mat-select formControlName="tariffId">
            <mat-option [value]="null">— Все платные тарифы —</mat-option>
            @for (t of _tariffs(); track t.id) {
              <mat-option [value]="t.id">{{ t.title }} ({{ t.priceRub }} ₽ / {{ t.periodDays }} дн.)</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <div class="flex gap-2">
          <mat-form-field appearance="fill" class="grow">
            <mat-label>Действует с</mat-label>
            <input matInput type="datetime-local" formControlName="validFrom" />
          </mat-form-field>
          <mat-form-field appearance="fill" class="grow">
            <mat-label>Действует до</mat-label>
            <input matInput type="datetime-local" formControlName="validUntil" />
          </mat-form-field>
        </div>
        <mat-checkbox formControlName="isActive">Активен</mat-checkbox>
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
export class PromoCodeEditDialogComponent {
  private readonly _tariffsStorage = inject(AppTariffsStorageService);
  protected readonly _data = inject<PromoCodeOut | null>(MAT_DIALOG_DATA);
  protected readonly _ref = inject(MatDialogRef<PromoCodeEditDialogComponent, PromoDialogResult>);

  protected readonly _tariffs = signal<TariffOut[]>([]);
  // Форма инициализируется значениями диалога при открытии, поэтому явный null
  // («Все платные тарифы») должен сохраниться как null, а не откатываться к старому
  protected readonly _form = new FormGroup({
    code: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    title: new FormControl<string | null>(null),
    discountPercent: new FormControl(10, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(99)]
    }),
    maxActivations: new FormControl<number | null>(null),
    tariffId: new FormControl<string | null>(null),
    validFrom: new FormControl<string | null>(null),
    validUntil: new FormControl<string | null>(null),
    isActive: new FormControl(true, { nonNullable: true })
  });

  constructor() {
    this._tariffsStorage.listAll().subscribe((list) =>
      this._tariffs.set(list.filter((t) => t.isActive && !t.isDefault))
    );
    if (this._data) {
      this._form.reset({
        code: this._data.code,
        title: this._data.title ?? null,
        discountPercent: this._data.discountPercent,
        maxActivations: this._data.maxActivations ?? null,
        tariffId: this._data.tariffId ?? null,
        validFrom: this._toLocalInput(this._data.validFrom),
        validUntil: this._toLocalInput(this._data.validUntil),
        isActive: this._data.isActive
      });
    }
  }

  protected _generate(): void {
    // Без 0/O/1/I — чтобы код не путался при ручном вводе
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = new Uint32Array(8);
    crypto.getRandomValues(bytes);
    const pick = (i: number) => alphabet[bytes[i] % alphabet.length];
    this._form.patchValue({ code: `${pick(0)}${pick(1)}${pick(2)}${pick(3)}-${pick(4)}${pick(5)}${pick(6)}${pick(7)}` });
  }

  protected _save(): void {
    if (this._form.invalid) return;
    const v = this._form.getRawValue();
    const shared = {
      title: v.title?.trim() || null,
      discountPercent: Number(v.discountPercent),
      tariffId: v.tariffId ?? null,
      maxActivations: v.maxActivations == null ? null : Number(v.maxActivations),
      validFrom: v.validFrom ? new Date(v.validFrom).toISOString() : null,
      validUntil: v.validUntil ? new Date(v.validUntil).toISOString() : null,
      isActive: v.isActive
    };
    // Код создаётся один раз и не меняется — в update он не входит
    this._ref.close(this._data ? shared : { code: v.code.trim(), ...shared });
  }

  private _toLocalInput(iso: string | null | undefined): string | null {
    if (!iso) return null;
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}

@Component({
  selector: 'app-promo-codes-editor',
  imports: [
    DatePipe,
    MatDialogModule,
    MatTableModule,
    MatButton,
    MatIconButton,
    MatIcon,
    MatTooltip,
    MatSnackBarModule
  ],
  templateUrl: './promo-codes-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PromoCodesEditorComponent {
  private readonly _storage = inject(AppPromoCodesStorageService);
  private readonly _tariffsStorage = inject(AppTariffsStorageService);
  private readonly _dialogs = inject(MatDialog);
  private readonly _snack = inject(MatSnackBar);
  private readonly _ref = inject(MatDialogRef<PromoCodesEditorComponent>);

  protected readonly _items = signal<PromoCodeOut[]>([]);
  private readonly _tariffList = signal<TariffOut[]>([]);
  protected readonly _tariffTitles = computed(() => {
    const map = new Map<string, string>();
    for (const t of this._tariffList()) map.set(t.id, t.title);
    return map;
  });
  protected readonly _loading = signal(true);
  protected readonly _columns = ['code', 'discount', 'tariff', 'activations', 'period', 'flags', 'actions'];

  constructor() {
    this._tariffsStorage.listAll().subscribe((list) => this._tariffList.set(list));
    this._reload();
  }

  protected _close(): void {
    this._ref.close();
  }

  protected _tariffTitle(id: string | null): string {
    return id ? (this._tariffTitles().get(id) ?? '—') : 'Все платные';
  }

  protected _reload(): void {
    this._loading.set(true);
    this._storage.listAll().subscribe({
      next: (list) => {
        this._items.set([...list]);
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
      .open(PromoCodeEditDialogComponent, { data: null, width: '480px' })
      .afterClosed()
      .subscribe((body: PromoDialogResult | null | undefined) => {
        if (!body || !('code' in body)) return;
        this._storage.create(body).subscribe({
          next: () => this._reload(),
          error: (err) => this._toast(err)
        });
      });
  }

  protected _edit(p: PromoCodeOut): void {
    this._dialogs
      .open(PromoCodeEditDialogComponent, { data: p, width: '480px' })
      .afterClosed()
      .subscribe((body: PromoDialogResult | null | undefined) => {
        if (!body || 'code' in body) return;
        this._storage.update(p.id, body).subscribe({
          next: () => this._reload(),
          error: (err) => this._toast(err)
        });
      });
  }

  protected _delete(p: PromoCodeOut): void {
    if (!confirm(`Удалить промокод «${p.code}»?`)) return;
    this._storage.delete(p.id).subscribe({
      next: () => this._reload(),
      error: (err) => this._toast(err)
    });
  }

  protected _copy(p: PromoCodeOut): void {
    void navigator.clipboard.writeText(p.code);
  }

  private _toast(err: unknown): void {
    const msg = err instanceof ApiError ? err.detail : 'Ошибка запроса';
    this._snack.open(msg, 'OK', { duration: 5000 });
  }
}
