import { AppTestQuestionAnswerVm, NullableValue } from '@/core/utils';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-test-asnwer-builder',
  imports: [
    MatIcon,
    MatCheckboxModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatButton
  ],
  templateUrl: './test-asnwer-builder.component.html',
  styles: ``
})
export class TestAsnwerBuilderComponent {
  private readonly _ref = inject(MatDialogRef);
  private readonly _dialogData = inject<NullableValue<AppTestQuestionAnswerVm>>(MAT_DIALOG_DATA);

  protected readonly _form = new FormGroup({
    answerText: new FormControl<string>('', Validators.required),
    isCorrect: new FormControl<boolean>(false),
    score: new FormControl<NullableValue<number>>(null)
  });

  constructor() {
    this._reset();
  }

  private _reset(): void {
    if (this._dialogData == null) {
      return;
    }
    this._form.reset(this._dialogData);
  }

  protected _handleSubmit(): void {
    const v = this._form.getRawValue();
    this._ref.close({
      ...v,
      score: !v.score ? (v.isCorrect ? 1 : 0) : v.score
    });
  }

  protected _handleClose(): void {
    this._ref.close();
  }
}
