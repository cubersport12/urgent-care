import { AppTestQuestionActivationConditionKind, AppTestQuestionAnswerVm, AppTestQuestionVm, generateGUID, NullableValue, openFile } from '@/core/utils';
import { NgClass } from '@angular/common';
import { Component, inject } from '@angular/core';
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
import { TestEditorComponent } from '../test-editor.component';
import { AppFilesStorageService } from '@/core/api';

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
  private readonly _filesStorage = inject(AppFilesStorageService);
  private readonly _testEditor = inject(TestEditorComponent);
  private readonly _ref = inject(MatDialogRef);
  private readonly _files = new Map<string, Blob>();
  private readonly _dialog = inject(MatDialog);
  protected readonly _dialogData = inject<{ folderId: string; question?: AppTestQuestionVm; questions: AppTestQuestionVm[] }>(MAT_DIALOG_DATA);
  private readonly _id = this._dialogData.question?.id ?? generateGUID();
  protected readonly AppTestQuestionActivationConditionKind = AppTestQuestionActivationConditionKind;
  protected readonly _conditionDataTypes = ['score', 'correct'];
  protected readonly _conditionTypes: AppTestQuestionActivationConditionKind[] = [AppTestQuestionActivationConditionKind.CompleteQuestion];

  protected readonly _form = new FormGroup({
    name: new FormControl<string>(''),
    questionText: new FormControl<string>('', Validators.required),
    image: new FormControl<NullableValue<string>>(null),
    answers: new FormControl<AppTestQuestionAnswerVm[]>([]),
    order: new FormControl<NullableValue<number>>(null),
    useActivationCondition: new FormControl<boolean>(false),
    activationCondition: new FormGroup({
      kind: new FormControl(AppTestQuestionActivationConditionKind.CompleteQuestion),
      relationQuestionId: new FormControl<NullableValue<string>>(null, Validators.required),
      data: new FormGroup({
        type: new FormControl<'score' | 'correct'>('correct'),
        score: new FormControl<NullableValue<number>>(null),
        isCorrect: new FormControl<boolean>(true)
      })
    })
  });

  constructor() {
    this._reset();
  }

  private _fetchQuestionFile(): void {
    const image = this._dialogData.question?.image;
    if (image == null) {
      return;
    }
    this._filesStorage.downloadFile(image)
      .subscribe((r) => {
        this._files.set(image, r);
      });
  }

  private _reset(): void {
    if (this._dialogData.question == null) {
      return;
    }
    this._form.reset({
      ...this._dialogData.question,
      useActivationCondition: this._dialogData.question.activationCondition != null
    });
  }

  protected _handleSubmit(): void {
    const value = this._form.getRawValue() as Partial<typeof this._form.value>;
    if (!value.useActivationCondition) {
      delete value.activationCondition;
      delete value.useActivationCondition;
    }
    this._files.forEach((file, id) => {
      this._testEditor.addToSaveFile(id, file);
    });

    this._ref.close({
      ...(this._dialogData.question ?? {}),
      id: this._id,
      ...value
    });
  }

  protected _handleClose(): void {
    this._ref.close(null);
  }

  protected _humanizeConditionDataType(type: string): string {
    switch (type) {
      case 'score':
        return 'Баллы';
      case 'correct':
        return 'Правильность';
      default:
        return 'Unknown';
    }
  }

  protected _humanizeConditionKind(kind: AppTestQuestionActivationConditionKind): string {
    switch (kind) {
      case AppTestQuestionActivationConditionKind.CompleteQuestion:
        return 'По завершенному вопроса';
      default:
        return 'Unknown';
    }
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

  protected async _openFile() {
    const image = await openFile(['image/*']);
    const imageId = image.name;
    this._files.set(imageId, image);
    this._form.patchValue({
      image: imageId
    });
    this._form.markAllAsDirty();
  }
}
