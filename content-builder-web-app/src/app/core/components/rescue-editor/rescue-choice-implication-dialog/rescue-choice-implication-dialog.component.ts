import {
  RescueParameterSeverityEnum,
  RescueScheneChoiceImplicationVm
} from '@/core/utils';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AppDialogWrapperComponent } from '../../dialog-wrapper/dialog-wrapper.component';
import { AppSelectComponent, AppTextareaComponent, SelectOption } from '@/core/components/ui';

export type RescueChoiceImplicationDialogData = {
  implication: RescueScheneChoiceImplicationVm | null;
};

@Component({
  selector: 'app-rescue-choice-implication-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    AppDialogWrapperComponent,
    AppTextareaComponent,
    AppSelectComponent
  ],
  templateUrl: './rescue-choice-implication-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: ``
})
export class RescueChoiceImplicationDialogComponent {
  protected readonly _dialogData = inject<RescueChoiceImplicationDialogData>(MAT_DIALOG_DATA);
  private readonly _ref = inject(
    MatDialogRef<RescueChoiceImplicationDialogComponent, RescueScheneChoiceImplicationVm>
  );

  protected readonly _severityOptions: SelectOption[] = [
    { value: RescueParameterSeverityEnum.Normal, label: 'Нормальная' },
    { value: RescueParameterSeverityEnum.Low, label: 'Низкая' },
    { value: RescueParameterSeverityEnum.Medium, label: 'Средняя' },
    { value: RescueParameterSeverityEnum.High, label: 'Высокая' }
  ];

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
