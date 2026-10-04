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
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltip } from '@angular/material/tooltip';
import {
  AppAchievementsStorageService,
  AppArticlesStorageService,
  AppFilesStorageService,
  AppFoldersStorageService,
  AppRescueStorageService,
  AppTestsStorageService
} from '@/core/api';
import { ApiError } from '@/core/api/api-utils';
import type { AchievementCreate, AchievementOut } from '@/core/api/generated/types.gen';
import { generateGUID } from '@/core/utils';
import { toSignal } from '@angular/core/rxjs-interop';
import { forkJoin, startWith } from 'rxjs';
import { AppDialogWrapperComponent } from '../dialog-wrapper/dialog-wrapper.component';
import { AppDialogService } from '@/core/services/app-dialog.service';

type TargetKind = 'article' | 'test' | 'rescue' | 'folder';

const RULE_OPTIONS: { value: string; label: string; targetKind?: TargetKind }[] = [
  { value: 'manual', label: 'Вручную' },
  { value: 'articles_read', label: 'Прочитано статей (всего)' },
  { value: 'tests_passed', label: 'Пройдено тестов (всего)' },
  { value: 'rescues_completed', label: 'Пройдено новелл (всего)' },
  { value: 'article_completed', label: 'Прочитан документ', targetKind: 'article' },
  { value: 'test_passed', label: 'Сдан тест', targetKind: 'test' },
  { value: 'test_score', label: 'Балл за тест ≥ порога', targetKind: 'test' },
  { value: 'rescue_passed', label: 'Успешная новелла', targetKind: 'rescue' },
  { value: 'folder_completed', label: 'Завершена папка (все дети)', targetKind: 'folder' },
  { value: 'folder_rescues_passed', label: 'N успешных новелл в папке', targetKind: 'folder' }
];

const TARGET_LABEL: Record<TargetKind, string> = {
  article: 'Документ',
  test: 'Тест',
  rescue: 'Новелла',
  folder: 'Папка'
};

type TargetOption = { id: string; name: string };

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
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckbox,
    MatButton,
    MatIcon,
    AppDialogWrapperComponent
  ],
  template: `
    <app-dialog-wrapper
      [title]="_data ? 'Редактировать достижение' : 'Новое достижение'"
      [subtitle]="_data ? 'Настройка условий срабатывания и бейджа' : 'Создание достижения для геймификации обучения'"
      [saveDisabled]="_form.invalid || _uploading()"
      (save)="_save()"
      (close)="_ref.close()"
    >
      <form class="flex flex-col gap-3 min-w-[320px] max-w-full" [formGroup]="_form">
        <mat-form-field appearance="fill">
          <mat-label>Название достижения</mat-label>
          <input matInput formControlName="title" />
        </mat-form-field>
        <mat-form-field appearance="fill">
          <mat-label>Описание (условие получения)</mat-label>
          <textarea matInput formControlName="description" rows="2"></textarea>
        </mat-form-field>
        <div class="flex gap-2 items-center">
          <mat-form-field appearance="fill" class="grow" subscriptSizing="dynamic">
            <mat-label>Путь к иконке / изображение</mat-label>
            <input matInput formControlName="iconPath" />
          </mat-form-field>
          <button mat-stroked-button type="button" class="shrink-0 !h-14 !rounded-xl" (click)="_file.click()">
            <mat-icon svgIcon="upload" class="!w-4 !h-4 mr-1" />
            Загрузить
          </button>
          <input #_file type="file" accept="image/*" class="hidden" (change)="_onFile($event)" />
        </div>
        <div class="flex gap-2">
          <mat-form-field appearance="fill" class="grow">
            <mat-label>Тип правила</mat-label>
            <mat-select formControlName="ruleType">
              @for (o of _ruleOptions; track o.value) {
                <mat-option [value]="o.value">{{ o.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="fill" class="grow">
            <mat-label>Порог выполнения</mat-label>
            <input matInput type="number" formControlName="ruleThreshold" />
          </mat-form-field>
        </div>
        @if (_targetKind(); as kind) {
          <mat-form-field appearance="fill">
            <mat-label>{{ _targetLabel() }}</mat-label>
            <mat-select formControlName="ruleTargetId">
              @for (o of _targetOptions(); track o.id) {
                <mat-option [value]="o.id">{{ o.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }
        <mat-form-field appearance="fill">
          <mat-label>Порядок сортировки</mat-label>
          <input matInput type="number" formControlName="sortOrder" />
        </mat-form-field>
        <mat-checkbox formControlName="isActive">Достижение активно</mat-checkbox>
      </form>
    </app-dialog-wrapper>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AchievementEditDialogComponent {
  protected readonly _data = inject<AchievementOut | null>(MAT_DIALOG_DATA);
  protected readonly _ref = inject(MatDialogRef<AchievementEditDialogComponent, AchievementCreate | null>);
  private readonly _files = inject(AppFilesStorageService);
  private readonly _articles = inject(AppArticlesStorageService);
  private readonly _tests = inject(AppTestsStorageService);
  private readonly _rescues = inject(AppRescueStorageService);
  private readonly _folders = inject(AppFoldersStorageService);

  protected readonly _ruleOptions = RULE_OPTIONS;
  protected readonly _uploading = signal(false);
  private readonly _byKind = signal<Record<TargetKind, TargetOption[]>>({
    article: [],
    test: [],
    rescue: [],
    folder: []
  });

  protected readonly _form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl<string | null>(null),
    iconPath: new FormControl<string | null>(null),
    ruleType: new FormControl('manual', { nonNullable: true, validators: [Validators.required] }),
    ruleThreshold: new FormControl(1, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    ruleTargetId: new FormControl<string | null>(null),
    sortOrder: new FormControl(0, { nonNullable: true }),
    isActive: new FormControl(true, { nonNullable: true })
  });

  private readonly _ruleTypeValue = toSignal(
    this._form.controls.ruleType.valueChanges.pipe(startWith(this._form.controls.ruleType.value)),
    { initialValue: this._form.controls.ruleType.value }
  );

  protected readonly _targetKind = computed((): TargetKind | null => {
    const t = this._ruleTypeValue();
    return RULE_OPTIONS.find((o) => o.value === t)?.targetKind ?? null;
  });

  protected readonly _targetLabel = computed(() => {
    const kind = this._targetKind();
    return kind ? TARGET_LABEL[kind] : '';
  });

  protected readonly _targetOptions = computed(() => {
    const kind = this._targetKind();
    return kind ? this._byKind()[kind] : [];
  });

  constructor() {
    if (this._data) {
      this._form.reset({
        title: this._data.title,
        description: this._data.description ?? null,
        iconPath: this._data.iconPath ?? null,
        ruleType: this._data.ruleType,
        ruleThreshold: this._data.ruleThreshold,
        ruleTargetId: this._data.ruleTargetId ?? null,
        sortOrder: this._data.sortOrder,
        isActive: this._data.isActive
      });
    }

    let prevKind =
      RULE_OPTIONS.find((o) => o.value === this._form.controls.ruleType.value)?.targetKind ?? null;
    this._form.controls.ruleType.valueChanges.subscribe((rt) => {
      const kind = RULE_OPTIONS.find((o) => o.value === rt)?.targetKind ?? null;
      if (kind !== prevKind) {
        this._form.controls.ruleTargetId.setValue(null);
        prevKind = kind;
      }
    });

    forkJoin({
      article: this._articles.fetchAllArticles(),
      test: this._tests.fetchAllTests(),
      rescue: this._rescues.fetchAllRescueItems(),
      folder: this._folders.fetchAllFolders()
    }).subscribe({
      next: (res) => {
        const map = (items: { id: string; name: string }[]): TargetOption[] =>
          [...items]
            .map((i) => ({ id: i.id, name: i.name?.trim() || i.id }))
            .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
        this._byKind.set({
          article: map(res.article),
          test: map(res.test),
          rescue: map(res.rescue),
          folder: map(res.folder)
        });
      }
    });
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
    const kind = RULE_OPTIONS.find((o) => o.value === v.ruleType)?.targetKind;
    const target = v.ruleTargetId?.trim() || null;
    if (kind && !target) return;
    this._ref.close({
      code: this._data?.code ?? `ach_${generateGUID().replace(/-/g, '').slice(0, 16)}`,
      title: v.title.trim(),
      description: v.description?.trim() || null,
      iconPath: v.iconPath?.trim() || null,
      ruleType: v.ruleType,
      ruleThreshold: Number(v.ruleThreshold),
      ruleTargetId: kind ? target : null,
      sortOrder: Number(v.sortOrder),
      isActive: v.isActive
    });
  }
}

@Component({
  selector: 'app-achievements-editor',
  imports: [
    FormsModule,
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
  private readonly _dialogsService = inject(AppDialogService);
  private readonly _snack = inject(MatSnackBar);
  protected readonly _ref = inject(MatDialogRef<AchievementsEditorComponent>, { optional: true });

  protected readonly _items = signal<AchievementOut[]>([]);
  protected readonly _loading = signal(true);
  protected readonly _searchQuery = signal('');

  protected readonly _filteredItems = computed(() => {
    const q = this._searchQuery().trim().toLowerCase();
    const list = this._items();
    if (!q) return list;
    return list.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q) ||
        (a.description && a.description.toLowerCase().includes(q))
    );
  });

  protected readonly _stats = computed(() => {
    const list = this._items();
    const active = list.filter((a) => a.isActive).length;
    const thresholdCount = list.filter((a) => (a.ruleThreshold || 0) > 0).length;
    return {
      total: list.length,
      active,
      thresholdCount,
      ruleTypes: new Set(list.map((a) => a.ruleType)).size
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
    this._dialogsService
      .open(AchievementEditDialogComponent, { data: null, width: '540px' })
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
    this._dialogsService
      .open(AchievementEditDialogComponent, { data: item, width: '540px' })
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
    this._snack.open(msg, 'Закрыть', { duration: 5000 });
  }
}
