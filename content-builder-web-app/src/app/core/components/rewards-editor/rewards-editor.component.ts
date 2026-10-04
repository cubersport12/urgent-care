import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { forkJoin } from 'rxjs';
import {
  AppAchievementsStorageService,
  AppFilesStorageService,
  AppRewardsStorageService,
  AppTariffsStorageService
} from '@/core/api';
import { ApiError } from '@/core/api/api-utils';
import type { AchievementOut, RewardCreate, RewardOut, TariffOut } from '@/core/api/generated/types.gen';
import { generateGUID } from '@/core/utils';
import { AppDialogWrapperComponent } from '../dialog-wrapper/dialog-wrapper.component';
import { AppDialogService } from '@/core/services/app-dialog.service';
import {
  AppButtonComponent,
  AppIconButtonComponent,
  AppInputComponent,
  AppTextareaComponent,
  AppSelectComponent,
  AppCheckboxComponent,
  AppBadgeComponent
} from '@/core/components/ui';

type RewardEditData = { reward: RewardOut | null; achievements: AchievementOut[] };

/** Тариф и срок задаются парой: одно без другого — ошибка формы. */
function subscriptionPairValidator(control: AbstractControl) {
  const tariff = control.get('subscriptionTariffId')?.value ?? null;
  const days = control.get('subscriptionDays')?.value ?? null;
  return (tariff == null) !== (days == null) ? { subscriptionPair: true } : null;
}

@Injectable({ providedIn: 'root' })
export class RewardsEditorService {
  private readonly _dialogsService = inject(AppDialogService);

  public open(): MatDialogRef<RewardsEditorComponent> {
    return this._dialogsService.open(RewardsEditorComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh'
    });
  }
}

@Component({
  selector: 'app-reward-edit-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    AppDialogWrapperComponent,
    AppButtonComponent,
    AppIconButtonComponent,
    AppInputComponent,
    AppTextareaComponent,
    AppSelectComponent,
    AppCheckboxComponent
  ],
  template: `
    <app-dialog-wrapper
      [title]="_data.reward ? 'Редактировать награду' : 'Новая награда'"
      [subtitle]="_data.reward ? 'Настройка призового фонда и условий выдачи' : 'Создание награды для поощрения пользователей'"
      [saveDisabled]="_form.invalid || _uploading() || _uploadingFiles()"
      [loading]="_uploading() || _uploadingFiles()"
      (save)="_save()"
      (close)="_ref.close()"
    >
      <form class="flex flex-col gap-3 min-w-[320px] max-w-full" [formGroup]="_form">
        <app-select
          label="Достижения (все нужны)"
          formControlName="achievementIds"
          [multiple]="true"
          [options]="_achievementOptions()"
          hint="Удерживайте Ctrl / Cmd для выбора нескольких достижений"
          [required]="true"
        />
        <app-input label="Название награды" formControlName="title" [required]="true" />
        <app-textarea label="Описание награды" formControlName="description" [rows]="2" />
        <div class="flex gap-2 items-center">
          <app-input label="Иконка награды (путь к файлу)" formControlName="iconPath" class="grow" />
          <app-button variant="outline" (click)="_file.click()" icon="upload">
            Загрузить
          </app-button>
          <input #_file type="file" accept="image/*" class="hidden" (change)="_onFile($event)" />
        </div>
        <div class="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
          <div class="flex gap-2 items-center justify-between">
            <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">Файлы и сертификаты</span>
            <app-button
              variant="outline"
              size="sm"
              [disabled]="_uploadingFiles()"
              (click)="_filesInput.click()"
            >
              {{ _uploadingFiles() ? 'Загрузка…' : 'Прикрепить файл' }}
            </app-button>
            <input
              #_filesInput
              type="file"
              multiple
              class="hidden"
              (change)="_onFiles($event)"
            />
          </div>
          @for (f of _attached(); track f) {
            <div class="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
              @if (_thumbs()[f]) {
                <img [src]="_thumbs()[f]" alt="" class="h-8 w-8 rounded object-cover shrink-0" />
              }
              <span class="text-xs text-slate-600 dark:text-slate-300 grow truncate">{{ _displayName(f) }}</span>
              <app-icon-button icon="trash" variant="ghost" size="sm" (click)="_removeFile(f)" tooltip="Убрать" class="text-slate-400 hover:text-rose-600" />
            </div>
          }
        </div>
        <app-input label="Порядок сортировки" type="number" formControlName="sortOrder" />
        <div class="flex flex-col gap-1">
          <div class="flex gap-2 items-start">
            <app-select
              label="Привязать подписку (необязательно)"
              formControlName="subscriptionTariffId"
              [options]="_tariffOptions()"
              class="grow"
            />
            <app-input label="Дней" type="number" formControlName="subscriptionDays" class="w-32" />
          </div>
          @if (_form.hasError('subscriptionPair')) {
            <div class="text-xs text-red-600">Укажите и тариф, и срок — или очистите оба поля</div>
          }
        </div>
        <app-checkbox formControlName="isActive" label="Награда активна" />
      </form>
    </app-dialog-wrapper>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RewardEditDialogComponent {
  protected readonly _data = inject<RewardEditData>(MAT_DIALOG_DATA);
  protected readonly _ref = inject(MatDialogRef<RewardEditDialogComponent, RewardCreate | null>);
  private readonly _files = inject(AppFilesStorageService);
  private readonly _tariffsStorage = inject(AppTariffsStorageService);
  private readonly _destroyRef = inject(DestroyRef);

  protected readonly _uploading = signal(false);
  protected readonly _uploadingFiles = signal(false);
  protected readonly _attached = signal<string[]>(this._data.reward?.files ?? []);
  protected readonly _thumbs = signal<Record<string, string>>({});
  protected readonly _tariffs = signal<TariffOut[]>([]);
  protected readonly _achievementOptions = computed(() =>
    this._data.achievements.map((a) => ({ value: a.id, label: `${a.title} (${a.code})` }))
  );
  protected readonly _tariffOptions = computed(() => [
    { value: null, label: '— Без подписки —' },
    ...this._tariffs().map((t) => ({ value: t.id, label: `${t.title} (${t.periodDays} дн.)` }))
  ]);

  protected readonly _form = new FormGroup(
    {
      achievementIds: new FormControl<string[]>([], {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(1)]
      }),
      title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      description: new FormControl<string | null>(null),
      iconPath: new FormControl<string | null>(null),
      subscriptionTariffId: new FormControl<string | null>(null),
      subscriptionDays: new FormControl<number | null>(null, {
        validators: [Validators.min(1), Validators.max(3650)]
      }),
      sortOrder: new FormControl(0, { nonNullable: true }),
      isActive: new FormControl(true, { nonNullable: true })
    },
    { validators: [subscriptionPairValidator] }
  );

  constructor() {
    const r = this._data.reward;
    if (r) {
      this._form.reset({
        achievementIds: [...r.achievementIds],
        title: r.title,
        description: r.description ?? null,
        iconPath: r.iconPath ?? null,
        subscriptionTariffId: r.subscriptionTariffId ?? null,
        subscriptionDays: r.subscriptionDays ?? null,
        sortOrder: r.sortOrder,
        isActive: r.isActive
      });
    } else if (this._data.achievements[0]) {
      this._form.controls.achievementIds.setValue([this._data.achievements[0].id]);
    }

    this._tariffsStorage.listAll().subscribe((list) => {
      this._tariffs.set([...list].sort((a, b) => a.rank - b.rank || a.sortOrder - b.sortOrder));
    });

    effect(() => {
      for (const path of this._attached()) {
        if (this._thumbs()[path] || !/\.(png|jpe?g|gif|webp|bmp)$/i.test(path)) continue;
        this._files.downloadFile(path).subscribe({
          next: (blob) => {
            const url = URL.createObjectURL(blob);
            this._thumbs.update((t) => ({ ...t, [path]: url }));
          },
          error: () => undefined
        });
      }
    });
    this._destroyRef.onDestroy(() => {
      for (const url of Object.values(this._thumbs())) URL.revokeObjectURL(url);
    });
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

  protected _onFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length) return;
    this._uploadingFiles.set(true);
    forkJoin(
      files.map((file) => {
        const dot = file.name.lastIndexOf('.');
        const ext = dot > 0 ? file.name.slice(dot + 1) : 'bin';
        // Читаемое имя кодируем в ключ ({guid}--{имя}.{ext}) — мобильное приложение показывает его,
        // guid до '--' гарантирует уникальность ключа.
        const base =
          (dot > 0 ? file.name.slice(0, dot) : file.name)
            .replace(/[^\p{L}\p{N} ._-]/gu, '')
            .trim()
            .slice(0, 80) || 'file';
        return this._files.uploadFile(`public/rewards/${generateGUID()}--${base}.${ext}`, file);
      })
    ).subscribe({
      next: (paths) => {
        this._attached.update((list) => [...list, ...paths]);
        this._uploadingFiles.set(false);
      },
      error: () => this._uploadingFiles.set(false)
    });
  }

  /** Имя файла для показа: часть после '{guid}--' в ключе. */
  protected _displayName(path: string): string {
    const base = path.split('/').pop() ?? path;
    const match = base.match(/^[0-9a-f-]{36}--(.+)$/i);
    return match ? match[1] : base;
  }

  protected _removeFile(path: string): void {
    this._attached.update((list) => list.filter((f) => f !== path));
  }

  protected _save(): void {
    if (this._form.invalid) return;
    const v = this._form.getRawValue();
    this._ref.close({
      achievementIds: v.achievementIds,
      title: v.title.trim(),
      description: v.description?.trim() || null,
      iconPath: v.iconPath?.trim() || null,
      files: this._attached().length ? this._attached() : null,
      subscriptionTariffId: v.subscriptionTariffId ?? null,
      subscriptionDays: v.subscriptionDays != null ? Number(v.subscriptionDays) : null,
      sortOrder: Number(v.sortOrder),
      isActive: v.isActive
    });
  }
}

@Component({
  selector: 'app-rewards-editor',
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
  templateUrl: './rewards-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RewardsEditorComponent {
  private readonly _storage = inject(AppRewardsStorageService);
  private readonly _achievements = inject(AppAchievementsStorageService);
  private readonly _dialogsService = inject(AppDialogService);
  private readonly _snack = inject(MatSnackBar);
  protected readonly _ref = inject(MatDialogRef<RewardsEditorComponent>, { optional: true });

  protected readonly _items = signal<RewardOut[]>([]);
  protected readonly _achievementMap = signal<Record<string, string>>({});
  protected readonly _achievementsList = signal<AchievementOut[]>([]);
  protected readonly _loading = signal(true);
  protected readonly _searchQuery = signal('');

  protected readonly _filteredItems = computed(() => {
    const q = this._searchQuery().trim().toLowerCase();
    const list = this._items();
    if (!q) return list;
    return list.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
    );
  });

  protected readonly _stats = computed(() => {
    const list = this._items();
    const active = list.filter((r) => r.isActive).length;
    const linkedToAchs = list.filter((r) => (r.achievementIds || []).length > 0).length;
    return {
      total: list.length,
      active,
      linkedToAchs
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
      this._snack.open('Сначала создайте достижение', 'Закрыть', { duration: 4000 });
      return;
    }
    this._dialogsService
      .open(RewardEditDialogComponent, {
        data: { reward: null, achievements: this._achievementsList() } satisfies RewardEditData,
        width: '560px'
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
    this._dialogsService
      .open(RewardEditDialogComponent, {
        data: { reward: item, achievements: this._achievementsList() } satisfies RewardEditData,
        width: '560px'
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
    this._snack.open(msg, 'Закрыть', { duration: 5000 });
  }
}
