import { AppLoading, TestsActions } from '@/core/store';
import { AppTestAccessablityCondition, AppTestQuestionVm, AppTestVm, generateGUID, NullableValue } from '@/core/utils';
import { Component, computed, effect, inject, Injectable } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Store } from '@ngxs/store';
import { TestConditionsBuilderComponent } from './test-condition-builder/test-conditions-builder.component';
import { TestQuestionsBuilderComponent } from './test-questions-builder/test-questions-builder.component';
import { MatCheckbox } from '@angular/material/checkbox';
import { AppFilesStorageService } from '@/core/api';
import { forkJoin, Observable, of } from 'rxjs';
import { cloneDeep, sum } from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class TestsEditorService {
  private readonly _dialogs = inject(MatDialog);
  public openTest(test: Partial<AppTestVm>): void {
    this._dialogs.open(TestEditorComponent, {
      width: '90%',
      height: '90%',
      maxWidth: '90%',
      minWidth: '90%',
      hasBackdrop: true,
      autoFocus: true,
      disableClose: true,
      data: test
    });
  }
}

@Component({
  selector: 'app-test-editor',
  imports: [
    MatIcon,
    MatButton,
    ReactiveFormsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatCheckbox,
    MatInputModule,
    TestConditionsBuilderComponent,
    TestQuestionsBuilderComponent
  ],
  templateUrl: './test-editor.component.html',
  styles: ``
})
export class TestEditorComponent {
  protected readonly _dialogData = inject<AppTestVm>(MAT_DIALOG_DATA);
  private readonly _filesStorage = inject(AppFilesStorageService);
  private readonly _ref = inject(MatDialogRef);
  private readonly _store = inject(Store);
  private readonly _dispatched = inject(AppLoading);
  private readonly _toSaveFiles = new Map<string, Blob>();
  private readonly _toRemoveFiles = new Set<string>();

  protected readonly _isPending = computed(() =>
    this._dispatched.isDispatched(TestsActions.CreateTest)()
    || this._dispatched.isDispatched(TestsActions.UpdateTest)()
  );

  protected readonly _form = new FormGroup({
    name: new FormControl<string>('', Validators.required),
    conditions: new FormControl<AppTestAccessablityCondition[]>([]),
    questions: new FormControl<AppTestQuestionVm[]>([]),
    minScore: new FormControl<NullableValue<number>>(null),
    maxErrors: new FormControl<NullableValue<number>>(null),
    showCorrectAnswer: new FormControl<boolean>(true),
    includeToStatistics: new FormControl<boolean>(false),
    showSkipButton: new FormControl<boolean>(true),
    showNavigation: new FormControl<boolean>(true),
    showBackButton: new FormControl<boolean>(true),
    hidden: new FormControl<boolean>(false)
  });

  // Вычисляем сумму правильных баллов
  protected readonly _totalCorrectScore = computed(() => {
    const questions = this._form.value.questions ?? [];
    return sum(questions.map((q) => {
      if (!q.answers || q.answers.length === 0) return 0;
      // Суммируем баллы правильных ответов
      return sum(q.answers
        .filter(a => a.isCorrect)
        .map(a => a.score ?? 0));
    }));
  });

  // Проверка валидности проходного балла
  protected readonly _scoreValidation = computed(() => {
    const minScore = this._form.value.minScore;
    const totalScore = this._totalCorrectScore();

    if (minScore == null || totalScore === 0) {
      return { type: null, message: null };
    }

    if (minScore > totalScore) {
      return {
        type: 'error',
        message: `Проходной балл (${minScore}) превышает максимально возможный балл (${totalScore})`
      };
    }

    if (minScore !== totalScore) {
      return {
        type: 'warning',
        message: `Проходной балл (${minScore}) не равен максимально возможному баллу (${totalScore})`
      };
    }

    return { type: null, message: null };
  });

  constructor() {
    effect(() => {
      const isPending = this._isPending();
      if (isPending) {
        this._form.disable();
      }
      else {
        this._form.enable();
      }
    });
    this._reset();
  }

  private _reset(): void {
    const { name, accessabilityConditions, questions, minScore, maxErrors, showCorrectAnswer, includeToStatistics, showSkipButton, showNavigation, showBackButton, hidden } = this._dialogData;
    this._form.reset({
      name,
      conditions: accessabilityConditions ?? [],
      questions: (questions ?? []).map(x => cloneDeep(x)),
      minScore,
      maxErrors,
      showCorrectAnswer,
      includeToStatistics,
      showSkipButton: showSkipButton ?? true,
      showNavigation: showNavigation ?? true,
      showBackButton: showBackButton ?? true,
      hidden: hidden ?? false
    });
  }

  protected _calculateMinScore(): void {
    const totalScore = this._totalCorrectScore();
    this._form.patchValue({ minScore: totalScore });
    this._form.controls.minScore.markAsDirty();
  }

  private _getTestVm(): AppTestVm {
    const { name, conditions, maxErrors, minScore, questions, showCorrectAnswer, includeToStatistics, showSkipButton, showNavigation, showBackButton, hidden } = this._form.value;
    const result: AppTestVm = {
      ...(this._dialogData ?? {}),
      name: name!,
      accessabilityConditions: conditions ?? [],
      maxErrors,
      minScore,
      showCorrectAnswer,
      includeToStatistics,
      questions: questions ?? [],
      showSkipButton,
      showNavigation,
      showBackButton,
      hidden
    };
    if ('type' in result) {
      delete result['type'];
    }
    return result;
  }

  private _createTest(): void {
    const newId = generateGUID();
    const toCreate = this._getTestVm();
    forkJoin([
      this._store.dispatch(new TestsActions.CreateTest({
        ...toCreate,
        id: newId
      })),
      this._saveFiles()
    ])
      .subscribe(() => {
        this._handleClose();
      });
  }

  private _updateTest(): void {
    forkJoin([
      this._store.dispatch(new TestsActions.UpdateTest(this._dialogData.id, this._getTestVm())),
      this._saveFiles()
    ])
      .subscribe(() => {
        this._handleClose();
      });
  }

  private _saveFiles(): Observable<void> {
    if (this._toSaveFiles.size > 0 || this._toRemoveFiles.size > 0) {
      const array: Observable<string | void>[] = [];
      this._toSaveFiles.forEach((file, id) => {
        array.push(this._filesStorage.uploadFile(id, file));
      });
      this._toRemoveFiles.forEach((file, id) => {
        array.push(this._filesStorage.deleteFile(id));
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return forkJoin(array) as any;
    }
    return of(void 0);
  }

  protected _handleSubmit(): void {
    const isNew = this._dialogData.id == null;
    if (isNew) {
      this._createTest();
    }
    else {
      this._updateTest();
    }
  }

  protected _handleClose(): void {
    this._ref.close();
  }

  public addToSaveFile(id: string, file: Blob): void {
    this._toSaveFiles.set(id, file);
    this._form.markAsDirty();
  }

  public addToRemoveFile(id: string): void {
    this._toRemoveFiles.add(id);
    this._form.markAsDirty();
  }
}
