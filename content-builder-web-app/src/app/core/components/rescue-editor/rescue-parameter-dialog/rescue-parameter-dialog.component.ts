import { generateGUID, RescueTimerParameterVm } from '@/core/utils';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export type RescueParameterDialogData = {
  parameter: RescueTimerParameterVm | null;
};

@Component({
  selector: 'app-rescue-parameter-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButton,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './rescue-parameter-dialog.component.html',
  styles: ``
})
export class RescueParameterDialogComponent {
  protected readonly _dialogData = inject<RescueParameterDialogData>(MAT_DIALOG_DATA);
  private readonly _ref = inject(MatDialogRef<RescueParameterDialogComponent, RescueTimerParameterVm>);

  /** id генерируется автоматически при создании, при редактировании — из переданного параметра */
  protected readonly _form = new FormGroup({
    id: new FormControl<string>(
      this._dialogData.parameter?.id ?? generateGUID(),
      Validators.required
    ),
    name: new FormControl<string>(
      this._dialogData.parameter?.name ?? '',
      Validators.required
    ),
    delta: new FormControl<number>(this._dialogData.parameter?.delta ?? 0),
    startValue: new FormControl<number>(this._dialogData.parameter?.startValue ?? 0)
  });

  protected _submit(): void {
    if (this._form.invalid) {
      return;
    }
    const v = this._form.getRawValue();
    this._ref.close({
      id: v.id!,
      name: v.name!,
      delta: v.delta ?? 0,
      startValue: v.startValue ?? 0
    });
  }

  protected _cancel(): void {
    this._ref.close();
  }
}
