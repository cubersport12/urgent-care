import { AppLoading, TestsActions, TestsState } from '@/core/store';
import {
  AppTestAccessablityCondition,
  AppTestAccessablityConditionTest,
  AppTestQuestionVm,
  AppTestVm,
  generateGUID,
  NullableValue
} from '@/core/utils';
import { Component, computed, effect, inject, Injectable, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { toSignal } from '@angular/core/rxjs-interop';
import { findCyclePath } from '@/core/utils/graph';
import {
  AppButtonComponent,
  AppIconButtonComponent,
  AppInputComponent,
  AppSelectComponent,
  AppCheckboxComponent
} from '../ui';
import { Store } from '@ngxs/store';
import { TestConditionsBuilderComponent } from './test-condition-builder/test-conditions-builder.component';
import { TestQuestionsBuilderComponent } from './test-questions-builder/test-questions-builder.component';
import { AppFilesStorageService } from '@/core/api';
import { forkJoin, Observable, of } from 'rxjs';
import { take } from 'rxjs/operators';
import { cloneDeep, sum } from 'lodash';
import { RewardSelectComponent } from '../reward-select/reward-select.component';
import { TariffSelectComponent } from '../tariff-select/tariff-select.component';
import { AppDialogWrapperComponent } from '../dialog-wrapper/dialog-wrapper.component';
import { AppDialogService } from '@/core/services/app-dialog.service';
import {
  TestAiGenerateDialogComponent,
  TestAiGenerateDialogData,
  TestAiGenerateDialogResult
} from './test-ai-generate-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class TestsEditorService {
  private readonly _appDialog = inject(AppDialogService);
  public openTest(test: Partial<AppTestVm>): void {
    this._appDialog.open(TestEditorComponent, {
      width: '1100px',
      maxWidth: '96vw',
      maxHeight: '94vh',
      hasBackdrop: true,
      autoFocus: true,
      disableClose: true,
      data: test
    });
  }

  public openTestManual(parentId: NullableValue<string>): void {
    this.openTest({ parentId });
  }

  public openTestWithAi(parentId: NullableValue<string>): void {
    this._appDialog
      .open(TestAiGenerateDialogComponent, {
        data: { parentId } satisfies TestAiGenerateDialogData,
        width: '560px',
        maxWidth: '95vw',
        disableClose: false
      })
      .afterClosed()
      .pipe(take(1))
      .subscribe((result: TestAiGenerateDialogResult | undefined) => {
        if (result != null) {
          this.openTest(result);
        }
      });
  }
}

@Component({
  selector: 'app-test-editor',
  imports: [
    MatIcon,
    ReactiveFormsModule,
    AppIconButtonComponent,
    AppInputComponent,
    AppSelectComponent,
    AppCheckboxComponent,
    TestConditionsBuilderComponent,
    TestQuestionsBuilderComponent,
    TariffSelectComponent,
    RewardSelectComponent,
    AppDialogWrapperComponent
  ],
  templateUrl: './test-editor.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
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
    hidden: new FormControl<boolean>(false),
    randomizeQuestions: new FormControl<boolean>(false),
    questionsToShow: new FormControl<NullableValue<number>>(null),
    resetStatistics: new FormControl<boolean>(false, { nonNullable: true }),
    resetStatisticsTestIds: new FormControl<string[]>([], { nonNullable: true }),
    requiredTariffId: new FormControl<string | null>(null),
    requiredRewardId: new FormControl<string | null>(null)
  });

  /** Все тесты, кроме текущего — варианты для списка сброса. */
  protected readonly _resetCandidates = computed(() =>
    [...this._store.selectSignal(TestsState.getAllTests)()]
      .filter((t) => t.id !== this._dialogData.id)
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  );

  protected readonly _resetCandidatesOptions = computed(() =>
    this._resetCandidates().map((t) => ({ value: t.id, label: t.name }))
  );

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

    return { type: null, message: null };
  });

  /** Условия доступа из формы — как сигнал, для реактивной проверки циклов. */
  private readonly _formConditions = toSignal(
    this._form.controls.conditions.valueChanges,
    { initialValue: this._form.controls.conditions.value }
  );

  /**
   * Цикл в графе условий доступа: тест A требует сдачи B, B — сдачи A (напрямую или
   * через цепочку) — такие тесты взаимоисключающе блокируют друг друга.
   * ponytail: отдельного типа вопроса «упорядочивание этапов» в модели нет,
   * поэтому граф строится только по test-условиям.
   */
  protected readonly _conditionCycle = computed<string | null>(() => {
    const allTests = this._store.selectSignal(TestsState.getAllTests)();
    const selfId = this._dialogData.id ?? '__new__';
    const nameOf = (id: string): string =>
      id === selfId
        ? (this._form.value.name || 'Этот тест')
        : (allTests.find(t => t.id === id)?.name ?? id);

    const edges = new Map<string, string[]>();
    for (const t of allTests) {
      if (t.id === this._dialogData.id) continue; // условия текущего теста берём из формы
      edges.set(t.id, (t.accessabilityConditions ?? [])
        .filter((c): c is AppTestAccessablityConditionTest => c.type === 'test')
        .map(c => c.testId));
    }
    edges.set(selfId, (this._formConditions() ?? [])
      .filter((c): c is AppTestAccessablityConditionTest => c.type === 'test')
      .map(c => c.testId));

    const cycle = findCyclePath(edges, selfId);
    return cycle
      ? `Циклическая зависимость: ${cycle.map(nameOf).join(' → ')} — тесты заблокируют друг друга`
      : null;
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
    this._store.dispatch(new TestsActions.FetchAllTests());
    this._reset();
  }

  private _reset(): void {
    const { name, accessabilityConditions, questions, minScore, maxErrors, showCorrectAnswer, includeToStatistics, showSkipButton, showNavigation, showBackButton, hidden, randomizeQuestions, questionsToShow, resetTestIds, requiredTariffId, requiredRewardId } = this._dialogData;
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
      hidden: hidden ?? false,
      randomizeQuestions: randomizeQuestions ?? false,
      questionsToShow: questionsToShow ?? null,
      resetStatistics: !!resetTestIds?.length,
      resetStatisticsTestIds: resetTestIds ?? [],
      requiredTariffId: requiredTariffId ?? null,
      requiredRewardId: requiredRewardId ?? null
    });
  }

  /**
   * Рекомендация проходного балла: 80% от взвешенного максимума, где сложные
   * вопросы (несколько правильных ответов) весят ×2; критические ошибки
   * (отрицательный балл у неверного ответа) добавляют свой худший штраф.
   * Итог не превышает достижимый максимум.
   */
  protected _calculateMinScore(): void {
    let weightedMax = 0;
    let criticalPenalty = 0;
    let achievableMax = 0;
    for (const q of this._form.value.questions ?? []) {
      const answers = q.answers ?? [];
      if (answers.length === 0) continue;
      const correctAnswers = answers.filter(a => a.isCorrect);
      const correctMax = sum(correctAnswers.map(a => Math.max(a.score ?? 0, 0)));
      achievableMax += correctMax;
      weightedMax += correctMax * (correctAnswers.length > 1 ? 2 : 1);
      criticalPenalty += Math.max(0, ...answers
        .filter(a => !a.isCorrect)
        .map(a => -(a.score ?? 0)));
    }
    const recommended = Math.min(achievableMax, Math.round(weightedMax * 0.8 + criticalPenalty));
    this._form.patchValue({ minScore: recommended });
    this._form.controls.minScore.markAsDirty();
  }

  private _getTestVm(): AppTestVm {
    const { name, conditions, maxErrors, minScore, questions, showCorrectAnswer, includeToStatistics, showSkipButton, showNavigation, showBackButton, hidden, randomizeQuestions, questionsToShow, resetStatistics, resetStatisticsTestIds, requiredTariffId, requiredRewardId } = this._form.value;
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
      hidden,
      randomizeQuestions: randomizeQuestions ?? false,
      questionsToShow: randomizeQuestions ? (questionsToShow ?? null) : null,
      resetTestIds: resetStatistics ? (resetStatisticsTestIds ?? []) : null,
      requiredTariffId: requiredTariffId ?? null,
      requiredRewardId: requiredRewardId ?? null
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
    if (this._conditionCycle() != null) return; // инлайн-ошибка показана у блока условий
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
