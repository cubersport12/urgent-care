import { ChangeDetectionStrategy, Component, inject, Injectable } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Store } from '@ngxs/store';
import { AppFolderVm } from '@/core/utils';
import { FoldersActions } from '@/core/store';
import { TariffSelectComponent } from '../tariff-select/tariff-select.component';

@Injectable({ providedIn: 'root' })
export class FolderPropertiesService {
  private readonly _dialogs = inject(MatDialog);

  public open(folder: AppFolderVm): void {
    this._dialogs.open(FolderPropertiesComponent, {
      width: '420px',
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
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButton,
    MatIcon,
    TariffSelectComponent
  ],
  template: `
    <h2 mat-dialog-title>Свойства папки</h2>
    <mat-dialog-content>
      <form class="flex flex-col gap-2 pt-2" [formGroup]="_form">
        <mat-form-field appearance="fill">
          <mat-label>Наименование</mat-label>
          <input matInput formControlName="name" />
        </mat-form-field>
        <app-tariff-select [control]="_form.controls.requiredTariffId" />
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="_ref.close()">Отмена</button>
      <button
        mat-flat-button
        color="primary"
        type="button"
        [disabled]="_form.invalid || !_form.dirty"
        (click)="_save()"
      >
        <mat-icon svgIcon="check" />
        Сохранить
      </button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FolderPropertiesComponent {
  private readonly _data = inject<AppFolderVm>(MAT_DIALOG_DATA);
  protected readonly _ref = inject(MatDialogRef<FolderPropertiesComponent>);
  private readonly _store = inject(Store);

  protected readonly _form = new FormGroup({
    name: new FormControl(this._data.name, { nonNullable: true, validators: [Validators.required] }),
    requiredTariffId: new FormControl<string | null>(this._data.requiredTariffId ?? null)
  });

  protected _save(): void {
    const { name, requiredTariffId } = this._form.getRawValue();
    this._store
      .dispatch(
        new FoldersActions.UpdateFolder(this._data.id, {
          name,
          requiredTariffId
        })
      )
      .subscribe(() => this._ref.close(true));
  }
}
