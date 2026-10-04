import { ChangeDetectionStrategy, Component, inject, Injectable, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiError, apiCall } from '@/core/api/api-utils';
import type { UserListItemOut, RefundOut } from '@/core/api/generated/types.gen';
import { usersListUsers, billingRefundUserSubscription } from '@/core/api/generated/sdk.gen';

@Injectable({ providedIn: 'root' })
export class SubscriptionRefundEditorService {
  private readonly _dialogs = inject(MatDialog);

  public open(): MatDialogRef<SubscriptionRefundEditorComponent, RefundOut | undefined> {
    return this._dialogs.open(SubscriptionRefundEditorComponent, {
      width: '520px',
      maxWidth: '95vw',
      hasBackdrop: true,
      autoFocus: true
    });
  }
}

@Component({
  selector: 'app-subscription-refund-editor',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButton,
    MatIcon,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <h2 mat-dialog-title>Возврат средств за подписку</h2>
    <mat-dialog-content>
      <p class="text-xs text-slate-500 mb-3">
        Будет выполнен возврат средств через ЮKassa за последнюю успешную оплату подписки выбранного пользователя.
        Подписка пользователя будет сброшена на базовый тариф.
      </p>
      @if (_loading()) {
        <div class="flex items-center gap-2 py-4">
          <mat-spinner diameter="28" />
          <span class="text-sm text-slate-500">Загрузка пользователей…</span>
        </div>
      } @else {
        <mat-form-field appearance="fill" class="w-full">
          <mat-label>Пользователь</mat-label>
          <mat-select [formControl]="_selected">
            @for (u of _users(); track u.id) {
              <mat-option [value]="u.id">{{ u.fullName }} ({{ u.email }})</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-checkbox [formControl]="_cancelSubscription" class="mt-2 block">
          Отменить текущую подписку
        </mat-checkbox>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="_ref.close()">Отмена</button>
      <button
        mat-flat-button
        color="warn"
        type="button"
        [disabled]="_loading() || _refunding() || !_selected.value"
        (click)="_apply()"
      >
        <mat-icon svgIcon="credit-card" />
        {{ _refunding() ? 'Оформление возврата…' : 'ОК' }}
      </button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubscriptionRefundEditorComponent {
  protected readonly _ref = inject(MatDialogRef<SubscriptionRefundEditorComponent, RefundOut | undefined>);
  private readonly _snack = inject(MatSnackBar);

  protected readonly _users = signal<UserListItemOut[]>([]);
  protected readonly _loading = signal(true);
  protected readonly _refunding = signal(false);
  protected readonly _selected = new FormControl<string | null>(null, {
    validators: [Validators.required]
  });
  protected readonly _cancelSubscription = new FormControl<boolean>(true, {
    nonNullable: true
  });

  constructor() {
    void this._load();
  }

  private async _load(): Promise<void> {
    try {
      const users = await apiCall(() => usersListUsers());
      this._users.set([...users].sort((a, b) => a.fullName.localeCompare(b.fullName)));
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : 'Ошибка загрузки пользователей';
      this._snack.open(msg, 'OK', { duration: 5000 });
    } finally {
      this._loading.set(false);
    }
  }

  protected async _apply(): Promise<void> {
    const userId = this._selected.value;
    if (!userId || this._refunding()) return;
    this._refunding.set(true);
    try {
      const res = await apiCall(() =>
        billingRefundUserSubscription({
          path: { user_id: userId },
          body: {
            cancelSubscription: this._cancelSubscription.value
          }
        })
      );
      this._snack.open(
        `Возврат выполнен: ${res.refundedAmount} ₽. ${res.message}`,
        'OK',
        { duration: 4000 }
      );
      this._ref.close(res);
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : 'Ошибка при оформлении возврата';
      this._snack.open(msg, 'OK', { duration: 5000 });
    } finally {
      this._refunding.set(false);
    }
  }
}
