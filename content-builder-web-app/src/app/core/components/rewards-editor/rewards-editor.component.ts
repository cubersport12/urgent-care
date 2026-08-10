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
import {
  AppAchievementsStorageService,
  AppFilesStorageService,
  AppRewardsStorageService
} from '@/core/api';
import { ApiError } from '@/core/api/api-utils';
import type { AchievementOut, RewardCreate, RewardOut } from '@/core/api/generated/types.gen';
import { generateGUID } from '@/core/utils';

type RewardEditData = { reward: RewardOut | null; achievements: AchievementOut[] };

@Injectable({ providedIn: 'root' })
export class RewardsEditorService {
  private readonly _dialogs = inject(MatDialog);

  public open(): MatDialogRef<RewardsEditorComponent> {
    return this._dialogs.open(RewardsEditorComponent, {
      width: '780px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      hasBackdrop: true,
      autoFocus: true
    });
  }
}

@Component({
  selector: 'app-reward-edit-dialog',
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
    <h2 mat-dialog-title>{{ _data.reward ? 'Редактировать награду' : 'Новая награда' }}</h2>
    <mat-dialog-content>
      <form class="flex flex-col gap-2 pt-2 min-w-[280px]" [formGroup]="_form">
        <mat-form-field appearance="fill">
          <mat-label>Достижения (все нужны)</mat-label>
          <mat-select formControlName="achievementIds" multiple>
            @for (a of _data.achievements; track a.id) {
              <mat-option [value]="a.id">{{ a.title }} ({{ a.code }})</mat-option>
            }
          </mat-select>
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
        <mat-form-field appearance="fill">
          <mat-label>Порядок</mat-label>
          <input matInput type="number" formControlName="sortOrder" />
        </mat-form-field>
        <mat-checkbox formControlName="isActive">Активна</mat-checkbox>
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
export class RewardEditDialogComponent {
  protected readonly _data = inject<RewardEditData>(MAT_DIALOG_DATA);
  protected readonly _ref = inject(MatDialogRef<RewardEditDialogComponent, RewardCreate | null>);
  private readonly _files = inject(AppFilesStorageService);

  protected readonly _uploading = signal(false);

  protected readonly _form = new FormGroup({
    achievementIds: new FormControl<string[]>([], {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1)]
    }),
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl<string | null>(null),
    iconPath: new FormControl<string | null>(null),
    sortOrder: new FormControl(0, { nonNullable: true }),
    isActive: new FormControl(true, { nonNullable: true })
  });

  constructor() {
    const r = this._data.reward;
    if (r) {
      this._form.reset({
        achievementIds: [...r.achievementIds],
        title: r.title,
        description: r.description ?? null,
        iconPath: r.iconPath ?? null,
        sortOrder: r.sortOrder,
        isActive: r.isActive
      });
    } else if (this._data.achievements[0]) {
      this._form.controls.achievementIds.setValue([this._data.achievements[0].id]);
    }
  }

  protected _onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'png';
    const name = `public/rewards/${generateGUID()}.${ext}`;
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
      achievementIds: v.achievementIds,
      title: v.title.trim(),
      description: v.description?.trim() || null,
      iconPath: v.iconPath?.trim() || null,
      sortOrder: Number(v.sortOrder),
      isActive: v.isActive
    });
  }
}

@Component({
  selector: 'app-rewards-editor',
  imports: [
    MatDialogModule,
    MatTableModule,
    MatButton,
    MatIconButton,
    MatIcon,
    MatTooltip,
    MatSnackBarModule
  ],
  templateUrl: './rewards-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RewardsEditorComponent {
  private readonly _storage = inject(AppRewardsStorageService);
  private readonly _achievements = inject(AppAchievementsStorageService);
  private readonly _dialogs = inject(MatDialog);
  private readonly _snack = inject(MatSnackBar);
  private readonly _ref = inject(MatDialogRef<RewardsEditorComponent>);

  protected readonly _items = signal<RewardOut[]>([]);
  protected readonly _achievementMap = signal<Record<string, string>>({});
  protected readonly _achievementsList = signal<AchievementOut[]>([]);
  protected readonly _loading = signal(true);
  protected readonly _columns = ['title', 'achievement', 'flags', 'actions'];

  constructor() {
    this._reload();
  }

  protected _close(): void {
    this._ref.close();
  }

  protected _reload(): void {
    this._loading.set(true);
    this._achievements.listAll().subscribe({
      next: (achs) => {
        this._achievementsList.set(achs);
        const map: Record<string, string> = {};
        for (const a of achs) map[a.id] = a.title;
        this._achievementMap.set(map);
        this._storage.listAll().subscribe({
          next: (list) => {
            this._items.set(
              [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
            );
            this._loading.set(false);
          },
          error: (err: unknown) => {
            this._loading.set(false);
            this._toast(err);
          }
        });
      },
      error: (err: unknown) => {
        this._loading.set(false);
        this._toast(err);
      }
    });
  }

  protected _achievementTitles(ids: string[]): string {
    const map = this._achievementMap();
    return ids.map((id) => map[id] ?? id).join(', ');
  }

  protected _create(): void {
    if (this._achievementsList().length === 0) {
      this._snack.open('Сначала создайте достижение', 'OK', { duration: 4000 });
      return;
    }
    this._dialogs
      .open(RewardEditDialogComponent, {
        data: { reward: null, achievements: this._achievementsList() } satisfies RewardEditData,
        width: '440px'
      })
      .afterClosed()
      .subscribe((body: RewardCreate | null | undefined) => {
        if (!body) return;
        this._storage.create(body).subscribe({
          next: () => this._reload(),
          error: (err) => this._toast(err)
        });
      });
  }

  protected _edit(item: RewardOut): void {
    this._dialogs
      .open(RewardEditDialogComponent, {
        data: { reward: item, achievements: this._achievementsList() } satisfies RewardEditData,
        width: '440px'
      })
      .afterClosed()
      .subscribe((body: RewardCreate | null | undefined) => {
        if (!body) return;
        this._storage.update(item.id, body).subscribe({
          next: () => this._reload(),
          error: (err) => this._toast(err)
        });
      });
  }

  protected _delete(item: RewardOut): void {
    if (!confirm(`Удалить награду «${item.title}»?`)) return;
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
