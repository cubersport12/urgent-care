import {
  RescueParameterSeverityEnum,
  RescueScheneChoiceImplicationVm
} from '@/core/utils';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatOption, MatSelectModule } from '@angular/material/select';

export type RescueChoiceImplicationDialogData = {
  implication: RescueScheneChoiceImplicationVm | null;
};

@Component({
  selector: 'app-rescue-choice-implication-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButton,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOption
  ],
  templateUrl: './rescue-choice-implication-dialog.component.html',
  styles: ``
})
export class RescueChoiceImplicationDialogComponent {
  protected readonly _dialogData = inject<RescueChoiceImplicationDialogData>(MAT_DIALOG_DATA);
  private readonly _ref = inject(
    MatDialogRef<RescueChoiceImplicationDialogComponent, RescueScheneChoiceImplicationVm>
  );

  protected readonly _severityEnum = RescueParameterSeverityEnum;

  protected readonly _form = new FormGroup({
    description: new FormControl<string>(
      this._dialogData.implication?.description ?? '',
      Validators.required
    ),
    severity: new FormControl<RescueParameterSeverityEnum>(
      this._dialogData.implication?.severity ?? RescueParameterSeverityEnum.Normal,
      { nonNullable: true }
    )
  });

  protected _submit(): void {
    if (this._form.invalid) {
      return;
    }
    const v = this._form.getRawValue();
    this._ref.close({
      description: (v.description ?? '').trim(),
      severity: v.severity!
    });
  }

  protected _cancel(): void {
    this._ref.close();
  }
}
