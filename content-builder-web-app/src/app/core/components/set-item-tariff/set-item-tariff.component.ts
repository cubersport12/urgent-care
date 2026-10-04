import { ChangeDetectionStrategy, Component, inject, Injectable } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { TariffSelectComponent } from '../tariff-select/tariff-select.component';
import { AppDialogWrapperComponent } from '../dialog-wrapper/dialog-wrapper.component';
import { AppDialogService } from '@/core/services/app-dialog.service';

export type SetItemTariffDialogData = {
  itemName: string;
  requiredTariffId: string | null;
};

@Injectable({ providedIn: 'root' })
export class SetItemTariffService {
  private readonly _dialogs = inject(AppDialogService);

  public open(data: SetItemTariffDialogData): MatDialogRef<SetItemTariffComponent, string | null> {
    return this._dialogs.open<SetItemTariffComponent, SetItemTariffDialogData, string | null>(
      SetItemTariffComponent,
      {
        width: '440px',
        data,
        hasBackdrop: true,
        autoFocus: true
      }
    );
  }
}

@Component({
  selector: 'app-set-item-tariff',
  imports: [ReactiveFormsModule, MatIcon, TariffSelectComponent, AppDialogWrapperComponent],
  template: `
    <app-dialog-wrapper
      title="Назначить тарифный план"
      [subtitle]="_data.itemName"
      saveText="Применить"
      saveIcon="check"
      [saveDisabled]="_control.invalid"
      (save)="_save()"
      (close)="_ref.close()"
    >
      <div class="flex flex-col gap-4 min-w-[320px]">
        <!-- Info Banner -->
        <div class="flex items-start gap-3 p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50">
          <mat-icon svgIcon="tag" class="!w-5 !h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Выберите тарифный план, определяющий минимальный уровень подписки для доступа к объекту
            <strong class="text-slate-900 dark:text-white block mt-0.5 truncate">{{ _data.itemName }}</strong>
          </div>
        </div>

        <!-- Tariff Selector Card -->
        <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 space-y-2">
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Требуемый тариф
          </label>
          <app-tariff-select [control]="_control" />
        </div>
      </div>
    </app-dialog-wrapper>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SetItemTariffComponent {
  protected readonly _data = inject<SetItemTariffDialogData>(MAT_DIALOG_DATA);
  protected readonly _ref = inject(MatDialogRef<SetItemTariffComponent, string | null>);

  protected readonly _control = new FormControl<string | null>(
    this._data.requiredTariffId,
    { validators: [Validators.required] }
  );

  protected _save(): void {
    const id = this._control.value;
    if (id == null) return;
    this._ref.close(id);
  }
}
