import { AppTestQuestionAnswerVm, AppTestQuestionVm, generateGUID, NullableValue } from '@/core/utils';
import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { take } from 'rxjs';
import { TestAsnwerBuilderComponent } from '../test-asnwer-builder/test-asnwer-builder.component';
import { cloneDeep } from 'lodash';

@Component({
  selector: 'app-test-question-item-builder',
  imports: [
    MatIcon,
    MatCheckboxModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatButton,
    MatTableModule,
    NgClass
  ],
  templateUrl: './test-question-item-builder.component.html',
  styles: ``
})
export class TestQuestionItemBuilderComponent {
  private readonly _ref = inject(MatDialogRef);
  private readonly _dialog = inject(MatDialog);
  private readonly _dialogData = inject<{ folderId: string; question?: AppTestQuestionVm }>(MAT_DIALOG_DATA);

  protected readonly _form = new FormGroup({
    name: new FormControl<string>('', Validators.required),
    questionText: new FormControl<string>('', Validators.required),
    image: new FormControl<NullableValue<string>>(null),
    answers: new FormControl<AppTestQuestionAnswerVm[]>([]),
    order: new FormControl<NullableValue<number>>(null)
  });

  constructor() {
    this._reset();
  }

  private _reset(): void {
    if (this._dialogData.question == null) {
      return;
    }
    this._form.reset(this._dialogData.question);
  }

  protected _handleSubmit(): void {
    this._ref.close({
      ...(this._dialogData.question ?? {}),
      id: this._dialogData.question?.id ?? generateGUID(),
      ...this._form.getRawValue()
    });
  }

  protected _handleClose(): void {
    this._ref.close(null);
  }

  private _openAnswer(answer: NullableValue<AppTestQuestionAnswerVm>): void {
    this._dialog.open(TestAsnwerBuilderComponent, {
      hasBackdrop: true,
      disableClose: true,
      data: answer ? cloneDeep(answer) : answer
    })
      .afterClosed()
      .pipe(take(1))
      .subscribe((result: AppTestQuestionAnswerVm) => {
        if (result == null) {
          return;
        }
        const prev = this._form.getRawValue().answers ?? [];
        const index = prev.findIndex(x => x === answer);
        if (index !== -1) {
          prev.splice(index, 1, result);
        }
        else {
          prev.push(result);
        }
        this._form.patchValue({ answers: [...prev] });
        this._form.markAsDirty();
      });
  }

  protected _handleEdit(a: AppTestQuestionAnswerVm): void {
    this._openAnswer(a);
  }

  protected _handleDelete(a: AppTestQuestionAnswerVm): void {
    const prev = this._form.getRawValue().answers ?? [];
    const index = prev.findIndex(x => x === a);
    if (index !== -1) {
      prev.splice(index, 1);
    }
    this._form.patchValue({ answers: [...prev] });
    this._form.markAsDirty();
  }

  protected _handleAnswerCreate(): void {
    this._openAnswer(null);
  }
}
