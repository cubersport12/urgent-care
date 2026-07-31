import { ChangeDetectionStrategy, Component, inject, Injectable } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { TariffSelectComponent } from '../tariff-select/tariff-select.component';

export type SetItemTariffDialogData = {
  itemName: string;
  requiredTariffId: string | null;
};

@Injectable({ providedIn: 'root' })
export class SetItemTariffService {
  private readonly _dialogs = inject(MatDialog);

  public open(data: SetItemTariffDialogData): MatDialogRef<SetItemTariffComponent, string | null> {
    return this._dialogs.open<SetItemTariffComponent, SetItemTariffDialogData, string | null>(
      SetItemTariffComponent,
      {
        width: '400px',
        data,
        hasBackdrop: true,
        autoFocus: true
      }
    );
  }
}

@Component({
  selector: 'app-set-item-tariff',
  imports: [ReactiveFormsModule, MatDialogModule, MatButton, MatIcon, TariffSelectComponent],
  template: `
    <h2 mat-dialog-title>Назначить тариф</h2>
    <mat-dialog-content>
      <p class="text-sm text-slate-600 dark:text-slate-300 mb-2 truncate" [title]="_data.itemName">
        {{ _data.itemName }}
      </p>
      <app-tariff-select [control]="_control" />
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="_ref.close()">Отмена</button>
      <button
        mat-flat-button
        color="primary"
        type="button"
        [disabled]="_control.invalid"
        (click)="_save()"
      >
        <mat-icon svgIcon="check" />
        Применить
      </button>
    </mat-dialog-actions>
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
