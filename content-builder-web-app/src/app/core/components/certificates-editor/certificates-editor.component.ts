import { ChangeDetectionStrategy, Component, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { AppFilesStorageService } from '@/core/api';
import { ApiError, apiCall } from '@/core/api/api-utils';
import { certificatesIssue, usersListUsers } from '@/core/api/generated/sdk.gen';
import type { CertificateOut, UserListItemOut } from '@/core/api/generated/types.gen';

type CertPreview = { url: string; numberLabel: string };

@Injectable({ providedIn: 'root' })
export class CertificatesEditorService {
  private readonly _dialogs = inject(MatDialog);

  public open(): void {
    this._dialogs.open(CertificatesEditorComponent, {
      width: '640px',
      maxWidth: '95vw',
      hasBackdrop: true
    });
  }
}

@Component({
  selector: 'app-certificates-editor',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButton,
    MatSnackBarModule
  ],
  template: `
    <h2 mat-dialog-title>Выдача сертификата</h2>
    <mat-dialog-content>
      @if (_issued(); as issued) {
        <div class="flex flex-col gap-2 items-center">
          <img [src]="issued.url" alt="Сертификат" class="w-full rounded border" />
          <div class="text-sm text-slate-600">№ {{ issued.numberLabel }}</div>
        </div>
      } @else {
        <div class="flex flex-col gap-2 pt-2 min-w-[320px]" [formGroup]="_form">
          <mat-form-field appearance="fill">
            <mat-label>Пользователь</mat-label>
            <mat-select formControlName="userId">
              @for (u of _users(); track u.id) {
                <mat-option [value]="u.id">
                  {{ u.fullName || u.email }} ({{ u.email }})
                </mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="fill">
            <mat-label>Имя на сертификате</mat-label>
            <input matInput formControlName="displayName" placeholder="Фамилия Имя Отчество" />
            <mat-hint>Пусто — будет взято ФИО профиля (или email)</mat-hint>
          </mat-form-field>
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (_issued(); as issued) {
        <button mat-button type="button" (click)="_openTab(issued.url)">
          Открыть в новой вкладке
        </button>
        <button mat-flat-button color="primary" type="button" (click)="_ref.close()">
          Готово
        </button>
      } @else {
        <button mat-button type="button" (click)="_ref.close()">Отмена</button>
        <button
          mat-flat-button
          color="primary"
          type="button"
          [disabled]="_form.invalid || _issuing()"
          (click)="_issue()"
        >
          {{ _issuing() ? 'Выдача…' : 'Выдать сертификат' }}
        </button>
      }
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CertificatesEditorComponent {
  protected readonly _ref = inject(MatDialogRef<CertificatesEditorComponent, void>);
  private readonly _snack = inject(MatSnackBar);
  private readonly _files = inject(AppFilesStorageService);
  private readonly _destroyRef = inject(DestroyRef);

  protected readonly _users = signal<UserListItemOut[]>([]);
  protected readonly _issuing = signal(false);
  protected readonly _issued = signal<CertPreview | null>(null);

  protected readonly _form = new FormGroup({
    userId: new FormControl<string | null>(null, { validators: [Validators.required] }),
    displayName: new FormControl<string | null>(null)
  });

  constructor() {
    void this._loadUsers();
    this._form.controls.userId.valueChanges.subscribe((id) => {
      const user = this._users().find((u) => u.id === id);
      if (user?.fullName) {
        this._form.controls.displayName.setValue(user.fullName);
      }
    });
    this._destroyRef.onDestroy(() => {
      const issued = this._issued();
      if (issued) URL.revokeObjectURL(issued.url);
    });
  }

  private async _loadUsers(): Promise<void> {
    try {
      const users = await apiCall(() => usersListUsers());
      this._users.set(
        [...users].sort((a, b) =>
          (a.fullName || a.email).localeCompare(b.fullName || b.email, 'ru')
        )
      );
    } catch (err) {
      this._snack.open(
        err instanceof ApiError ? err.detail : 'Не удалось загрузить пользователей',
        'OK',
        { duration: 6000 }
      );
    }
  }

  protected _openTab(url: string): void {
    window.open(url, '_blank', 'noopener');
  }

  private _numberLabel(cert: CertificateOut): string {
    const year = new Date(cert.issuedAt).getFullYear();
    return `TD-${year}-${String(cert.number).padStart(6, '0')}`;
  }

  protected async _issue(): Promise<void> {
    if (this._form.invalid || this._issuing()) return;
    const v = this._form.getRawValue();
    if (!v.userId) return;
    this._issuing.set(true);
    try {
      // Повторная выдача тому же пользователю вернёт его существующий сертификат
      const cert = await apiCall(() =>
        certificatesIssue({
          body: {
            userId: v.userId!,
            displayName: v.displayName?.trim() || null
          }
        })
      );
      // PNG отдаётся только с сессией — тянем blob авторизованным запросом
      // (downloadFile возвращает Observable — оборачиваем в Promise)
      const blob = await firstValueFrom(this._files.downloadFile(cert.filePath));
      const url = URL.createObjectURL(blob);
      this._issued.set({ url, numberLabel: this._numberLabel(cert) });
    } catch (err) {
      this._snack.open(
        err instanceof ApiError ? err.detail : 'Не удалось выдать сертификат',
        'OK',
        { duration: 6000 }
      );
    } finally {
      this._issuing.set(false);
    }
  }
}
