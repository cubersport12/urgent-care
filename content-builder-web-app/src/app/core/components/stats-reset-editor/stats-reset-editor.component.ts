import { ChangeDetectionStrategy, Component, inject, Injectable, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltip } from '@angular/material/tooltip';
import { ApiError, apiCall } from '@/core/api/api-utils';
import type { UserListItemOut } from '@/core/api/generated/types.gen';
import { usersListUsers, usersResetUsersStats } from '@/core/api/generated/sdk.gen';

@Injectable({ providedIn: 'root' })
export class StatsResetEditorService {
  private readonly _dialogs = inject(MatDialog);

  public open(): MatDialogRef<StatsResetEditorComponent> {
    return this._dialogs.open(StatsResetEditorComponent, {
      width: '520px',
      maxWidth: '95vw',
      hasBackdrop: true,
      autoFocus: true
    });
  }
}

@Component({
  selector: 'app-stats-reset-editor',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButton,
    MatIcon,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltip
  ],
  template: `
    <h2 mat-dialog-title>Сбросить статистику</h2>
    <mat-dialog-content>
      <p class="text-xs text-slate-500 mb-3">
        Будут удалены все события обучения (статистика тестов, документов, режимов спасения)
        и полученные достижения выбранных пользователей. Действие необратимо.
      </p>
      @if (_loading()) {
        <div class="flex items-center gap-2 py-4">
          <mat-spinner diameter="28" />
          <span class="text-sm text-slate-500">Загрузка пользователей…</span>
        </div>
      } @else {
        <mat-form-field appearance="fill" class="w-full">
          <mat-label>Пользователи</mat-label>
          <mat-select [formControl]="_selected" multiple>
            @for (u of _users(); track u.id) {
              <mat-option [value]="u.id">{{ u.fullName }} ({{ u.email }})</mat-option>
            }
          </mat-select>
        </mat-form-field>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="_ref.close()">Отмена</button>
      <button
        mat-flat-button
        color="warn"
        type="button"
        [disabled]="_loading() || _resetting() || _selected.invalid"
        (click)="_apply()"
      >
        <mat-icon svgIcon="trash" />
        {{ _resetting() ? 'Сброс…' : 'Сбросить' }}
      </button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatsResetEditorComponent {
  protected readonly _ref = inject(MatDialogRef<StatsResetEditorComponent, number>);
  private readonly _snack = inject(MatSnackBar);

  protected readonly _users = signal<UserListItemOut[]>([]);
  protected readonly _loading = signal(true);
  protected readonly _resetting = signal(false);
  protected readonly _selected = new FormControl<string[]>([], {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(1)]
  });

  constructor() {
    void this._load();
  }

  private async _load(): Promise<void> {
    try {
      const users = await apiCall(() => usersListUsers());
      this._users.set([...users].sort((a, b) => a.fullName.localeCompare(b.fullName)));
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : 'Ошибка запроса';
      this._snack.open(msg, 'OK', { duration: 5000 });
    } finally {
      this._loading.set(false);
    }
  }

  protected async _apply(): Promise<void> {
    const userIds = this._selected.value;
    if (!userIds.length || this._resetting()) return;
    this._resetting.set(true);
    try {
      const res = await apiCall(() => usersResetUsersStats({ body: { userIds } }));
      this._snack.open(`Статистика сброшена для ${res.usersCount} польз.`, 'OK', { duration: 4000 });
      this._ref.close(res.usersCount);
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : 'Ошибка запроса';
      this._snack.open(msg, 'OK', { duration: 5000 });
    } finally {
      this._resetting.set(false);
    }
  }
}
