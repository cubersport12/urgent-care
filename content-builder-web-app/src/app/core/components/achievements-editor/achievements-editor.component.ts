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
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltip } from '@angular/material/tooltip';
import { AppAchievementsStorageService, AppFilesStorageService } from '@/core/api';
import { ApiError } from '@/core/api/api-utils';
import type { AchievementCreate, AchievementOut } from '@/core/api/generated/types.gen';
import { generateGUID } from '@/core/utils';

const RULE_OPTIONS: { value: string; label: string }[] = [
  { value: 'manual', label: 'Вручную' },
  { value: 'articles_read', label: 'Прочитано статей' },
  { value: 'tests_passed', label: 'Пройдено тестов' },
  { value: 'rescues_completed', label: 'Пройдено режимов' }
];

@Injectable({ providedIn: 'root' })
export class AchievementsEditorService {
  private readonly _dialogs = inject(MatDialog);

  public open(): MatDialogRef<AchievementsEditorComponent> {
    return this._dialogs.open(AchievementsEditorComponent, {
      width: '780px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      hasBackdrop: true,
      autoFocus: true
    });
  }
}

@Component({
  selector: 'app-achievement-edit-dialog',
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
    <h2 mat-dialog-title>{{ _data ? 'Редактировать достижение' : 'Новое достижение' }}</h2>
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
        <div class="flex gap-2 items-end">
          <mat-form-field appearance="fill" class="grow">
            <mat-label>Иконка (path)</mat-label>
            <input matInput formControlName="iconPath" />
          </mat-form-field>
          <button mat-stroked-button type="button" (click)="_file.click()">Загрузить</button>
          <input #_file type="file" accept="image/*" class="hidden" (change)="_onFile($event)" />
        </div>
        <div class="flex gap-2">
          <mat-form-field appearance="fill" class="grow">
            <mat-label>Условие</mat-label>
            <mat-select formControlName="ruleType">
              @for (o of _ruleOptions; track o.value) {
                <mat-option [value]="o.value">{{ o.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="fill" class="grow">
            <mat-label>Порог</mat-label>
            <input matInput type="number" formControlName="ruleThreshold" />
          </mat-form-field>
        </div>
        <mat-form-field appearance="fill">
          <mat-label>Порядок</mat-label>
          <input matInput type="number" formControlName="sortOrder" />
        </mat-form-field>
        <mat-checkbox formControlName="isActive">Активно</mat-checkbox>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="_ref.close()">Отмена</button>
      <button mat-flat-button color="primary" type="button" [disabled]="_form.invalid || _uploading()" (click)="_save()">
        <mat-icon svgIcon="check" />
        Сохранить
      </button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AchievementEditDialogComponent {
  protected readonly _data = inject<AchievementOut | null>(MAT_DIALOG_DATA);
  protected readonly _ref = inject(MatDialogRef<AchievementEditDialogComponent, AchievementCreate | null>);
  private readonly _files = inject(AppFilesStorageService);

  protected readonly _ruleOptions = RULE_OPTIONS;
  protected readonly _uploading = signal(false);

  protected readonly _form = new FormGroup({
    code: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl<string | null>(null),
    iconPath: new FormControl<string | null>(null),
    ruleType: new FormControl('manual', { nonNullable: true, validators: [Validators.required] }),
    ruleThreshold: new FormControl(1, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    sortOrder: new FormControl(0, { nonNullable: true }),
    isActive: new FormControl(true, { nonNullable: true })
  });

  constructor() {
    if (this._data) {
      this._form.reset({
        code: this._data.code,
        title: this._data.title,
        description: this._data.description ?? null,
        iconPath: this._data.iconPath ?? null,
        ruleType: this._data.ruleType,
        ruleThreshold: this._data.ruleThreshold,
        sortOrder: this._data.sortOrder,
        isActive: this._data.isActive
      });
    }
  }

  protected _onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'png';
    const name = `public/achievements/${generateGUID()}.${ext}`;
    this._uploading.set(true);
    this._files.uploadFile(name, file).subscribe({
      next: (path) => {
        this._form.controls.iconPath.setValue(path);
        this._uploading.set(false);
      },
      error: () => this._uploading.set(false)
    });
  }

  protected _save(): void {
    if (this._form.invalid) return;
    const v = this._form.getRawValue();
    this._ref.close({
      code: v.code.trim(),
      title: v.title.trim(),
      description: v.description?.trim() || null,
      iconPath: v.iconPath?.trim() || null,
      ruleType: v.ruleType,
      ruleThreshold: Number(v.ruleThreshold),
      sortOrder: Number(v.sortOrder),
      isActive: v.isActive
    });
  }
}

@Component({
  selector: 'app-achievements-editor',
  imports: [
    MatDialogModule,
    MatTableModule,
    MatButton,
    MatIconButton,
    MatIcon,
    MatTooltip,
    MatSnackBarModule
  ],
  templateUrl: './achievements-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AchievementsEditorComponent {
  private readonly _storage = inject(AppAchievementsStorageService);
  private readonly _dialogs = inject(MatDialog);
  private readonly _snack = inject(MatSnackBar);
  private readonly _ref = inject(MatDialogRef<AchievementsEditorComponent>);

  protected readonly _items = signal<AchievementOut[]>([]);
  protected readonly _loading = signal(true);
  protected readonly _columns = ['title', 'code', 'rule', 'flags', 'actions'];

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
        this._items.set([...list].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)));
        this._loading.set(false);
      },
      error: (err: unknown) => {
        this._loading.set(false);
        this._toast(err);
      }
    });
  }

  protected _ruleLabel(type: string): string {
    return RULE_OPTIONS.find((o) => o.value === type)?.label ?? type;
  }

  protected _create(): void {
    this._dialogs
      .open(AchievementEditDialogComponent, { data: null, width: '440px' })
      .afterClosed()
      .subscribe((body: AchievementCreate | null | undefined) => {
        if (!body) return;
        this._storage.create(body).subscribe({
          next: () => this._reload(),
          error: (err) => this._toast(err)
        });
      });
  }

  protected _edit(item: AchievementOut): void {
    this._dialogs
      .open(AchievementEditDialogComponent, { data: item, width: '440px' })
      .afterClosed()
      .subscribe((body: AchievementCreate | null | undefined) => {
        if (!body) return;
        this._storage.update(item.id, body).subscribe({
          next: () => this._reload(),
          error: (err) => this._toast(err)
        });
      });
  }

  protected _delete(item: AchievementOut): void {
    if (!confirm(`Удалить достижение «${item.title}»?`)) return;
    this._storage.delete(item.id).subscribe({
      next: () => this._reload(),
      error: (err) => this._toast(err)
    });
  }

  private _toast(err: unknown): void {
    const msg = err instanceof ApiError ? err.detail : 'Ошибка запроса';
    this._snack.open(msg, 'OK', { duration: 5000 });
  }
}
