import { ChangeDetectionStrategy, Component, inject, Injectable } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Store } from '@ngxs/store';
import { AppFolderVm } from '@/core/utils';
import { FoldersActions } from '@/core/store';
import { RewardSelectComponent } from '../reward-select/reward-select.component';
import { TariffSelectComponent } from '../tariff-select/tariff-select.component';
import { AppDialogWrapperComponent } from '../dialog-wrapper/dialog-wrapper.component';
import { AppDialogService } from '@/core/services/app-dialog.service';

@Injectable({ providedIn: 'root' })
export class FolderPropertiesService {
  private readonly _dialogs = inject(AppDialogService);

  public open(folder: AppFolderVm): MatDialogRef<FolderPropertiesComponent> {
    return this._dialogs.open(FolderPropertiesComponent, {
      width: '460px',
      data: folder,
      hasBackdrop: true,
      autoFocus: true
    });
  }
}

@Component({
  selector: 'app-folder-properties',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIcon,
    TariffSelectComponent,
    RewardSelectComponent,
    AppDialogWrapperComponent
  ],
  template: `
    <app-dialog-wrapper
      title="Свойства папки"
      [subtitle]="_data.name"
      [saveDisabled]="_form.invalid || !_form.dirty"
      (save)="_save()"
      (close)="_ref.close()"
    >
      <form class="flex flex-col gap-4 min-w-[320px]" [formGroup]="_form">
        <!-- Main Info Card -->
        <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 space-y-3">
          <div class="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <mat-icon svgIcon="folder" class="!w-4 !h-4 text-amber-500" />
            Основные сведения
          </div>
          <mat-form-field appearance="fill" class="w-full">
            <mat-label>Наименование папки</mat-label>
            <input matInput formControlName="name" placeholder="Например: Педиатрия и неотложные состояния" />
          </mat-form-field>
        </div>

        <!-- Access Control Card -->
        <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 space-y-3">
          <div class="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <mat-icon svgIcon="tag" class="!w-4 !h-4 text-blue-500" />
            Доступ и тариф
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 m-0">
            Задайте минимальный тарифный план, требуемый пользователю для открытия папки и её содержимого.
          </p>
          <app-tariff-select [control]="_form.controls.requiredTariffId" />
        </div>

        <!-- Reward Card -->
        <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 space-y-3">
          <div class="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <mat-icon svgIcon="trophy" class="!w-4 !h-4 text-amber-500" />
            Награда за прохождение
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 m-0">
            Опциональная награда, которая выдается за изучение всех материалов данной папки.
          </p>
          <app-reward-select [control]="_form.controls.requiredRewardId" />
        </div>
      </form>
    </app-dialog-wrapper>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FolderPropertiesComponent {
  protected readonly _data = inject<AppFolderVm>(MAT_DIALOG_DATA);
  protected readonly _ref = inject(MatDialogRef<FolderPropertiesComponent>);
  private readonly _store = inject(Store);

  protected readonly _form = new FormGroup({
    name: new FormControl(this._data.name, { nonNullable: true, validators: [Validators.required] }),
    requiredTariffId: new FormControl<string | null>(this._data.requiredTariffId ?? null),
    requiredRewardId: new FormControl<string | null>(this._data.requiredRewardId ?? null)
  });

  protected _save(): void {
    const { name, requiredTariffId, requiredRewardId } = this._form.getRawValue();
    this._store
      .dispatch(
        new FoldersActions.UpdateFolder(this._data.id, {
          name,
          requiredTariffId,
          requiredRewardId
        })
      )
      .subscribe(() => this._ref.close(true));
  }
}
