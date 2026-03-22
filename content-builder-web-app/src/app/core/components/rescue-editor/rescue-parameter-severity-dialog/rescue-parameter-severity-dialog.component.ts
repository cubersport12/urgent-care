import {
  RescueParameterSeverityEnum,
  RescueParameterSeverityVm
} from '@/core/utils';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatOption, MatSelectModule } from '@angular/material/select';

export type RescueParameterSeverityDialogData = {
  severity: RescueParameterSeverityVm | null;
};

@Component({
  selector: 'app-rescue-parameter-severity-dialog',
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
  templateUrl: './rescue-parameter-severity-dialog.component.html',
  styles: ``
})
export class RescueParameterSeverityDialogComponent {
  protected readonly _dialogData = inject<RescueParameterSeverityDialogData>(MAT_DIALOG_DATA);
  private readonly _ref = inject(
    MatDialogRef<RescueParameterSeverityDialogComponent, RescueParameterSeverityVm>
  );

  protected readonly _severityEnum = RescueParameterSeverityEnum;

  protected readonly _form = new FormGroup({
    min: new FormControl<number | null>(this._dialogData.severity?.min ?? null),
    max: new FormControl<number | null>(this._dialogData.severity?.max ?? null),
    severity: new FormControl<RescueParameterSeverityEnum | null>(
      this._dialogData.severity?.severity ?? null
    ),
    description: new FormControl<string>(this._dialogData.severity?.description ?? '', {
      nonNullable: true
    })
  });

  protected _submit(): void {
    const v = this._form.getRawValue();
    const result: RescueParameterSeverityVm = {};
    if (v.min != null && !Number.isNaN(Number(v.min))) {
      result.min = Number(v.min);
    }
    if (v.max != null && !Number.isNaN(Number(v.max))) {
      result.max = Number(v.max);
    }
    if (v.severity != null) {
      result.severity = v.severity;
    }
    const desc = (v.description ?? '').trim();
    if (desc.length > 0) {
      result.description = desc;
    }
    this._ref.close(result);
  }

  protected _cancel(): void {
    this._ref.close();
  }
}
