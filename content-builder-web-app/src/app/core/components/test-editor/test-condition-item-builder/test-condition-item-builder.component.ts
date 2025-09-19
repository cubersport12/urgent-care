import { ArticlesState, TestsState } from '@/core/store';
import {
  AppTestAccessablityCondition,
  AppTestAccessablityConditionArticle,
  AppTestAccessablityConditionTest,
  AppTestAccessablityConditionTestScore,
  AppTestAccessablityConditionTestSuccedded,
  AppTestAccessablityLogicalOperator } from '@/core/utils';
import { Component, computed, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Store } from '@ngxs/store';
import { merge } from 'lodash';

type ConditionType = AppTestAccessablityConditionTest['type'] | AppTestAccessablityConditionArticle['type'];
type TestParamType = AppTestAccessablityConditionTestScore['type'] | AppTestAccessablityConditionTestSuccedded['type'];

@Component({
  selector: 'app-test-condition-item-builder',
  imports: [
    MatIcon,
    MatCheckboxModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatButton
  ],
  templateUrl: './test-condition-item-builder.component.html',
  styles: ``
})
export class TestConditionItemBuilderComponent {
  private readonly _ref = inject(MatDialogRef);
  private readonly _dialogData = inject<{ folderId: string; condition?: AppTestAccessablityCondition }>(MAT_DIALOG_DATA);
  private readonly _store = inject(Store);
  protected readonly _logicalOperators: AppTestAccessablityLogicalOperator[] = [AppTestAccessablityLogicalOperator.And, AppTestAccessablityLogicalOperator.Or];
  protected readonly _conditionTypes: ConditionType[] = ['article', 'test'];
  protected readonly _testParamTypes: TestParamType[] = ['score', 'succedded'];
  protected readonly _form = new FormGroup({
    type: new FormControl<ConditionType>('article', Validators.required),
    logicalOperator: new FormControl<AppTestAccessablityLogicalOperator>(AppTestAccessablityLogicalOperator.And, Validators.required),
    article: new FormGroup({
      articleId: new FormControl<string>('', Validators.required),
      isReaded: new FormControl<boolean>(false)
    }),
    test: new FormGroup({
      type: new FormControl<TestParamType>('succedded', Validators.required),
      testId: new FormControl<string>('', Validators.required),
      score: new FormControl<number>(0, Validators.required),
      success: new FormControl<boolean>(true)
    })
  });

  protected readonly _tests = computed(() => {
    const s = this._store.selectSignal(TestsState.getTests)();
    return s(this._dialogData.folderId);
  });

  protected readonly _articles = computed(() => {
    const s = this._store.selectSignal(ArticlesState.getArticles)();
    return s(this._dialogData.folderId);
  });

  constructor() {
    this._resetForm();
  }

  private _resetForm(): void {
    if (this._dialogData.condition) {
      const c = this._dialogData.condition;
      const v: typeof this._form.value = {};
      if (c.type === 'test') {
        const data = c.data;
        v.type = 'test';
        v.logicalOperator = c.logicalOperator ?? AppTestAccessablityLogicalOperator.And;
        v.test = {
          testId: c.testId
        };
        if (data?.type === 'score') {
          v.test.type = 'score';
          v.test.score = data.score;
        }
        else if (data?.type === 'succedded') {
          v.test.type = 'succedded';
          v.test.success = data.success;
        }
        else {
          throw new Error('Unknown condition type');
        }
      }
      else if (c.type === 'article') {
        v.type = 'article';
        v.logicalOperator = c.logicalOperator ?? AppTestAccessablityLogicalOperator.And;
        v.article = {
          articleId: c.articleId
        };
        if (c.isReaded) {
          v.article.isReaded = c.isReaded;
        }
      }
      else {
        throw new Error('Unknown condition type');
      }

      this._form.reset(v);
    }
  }

  protected _translateConditionType(type: ConditionType): string {
    switch (type) {
      case 'article':
        return 'Текстовый документ';
      case 'test':
        return 'Тест';
      default:
        return 'Unknown';
    }
  }

  protected _translateTestParamType(type: TestParamType): string {
    switch (type) {
      case 'score':
        return 'Баллы';
      case 'succedded':
        return 'Успешность';
      default:
        return 'Unknown';
    }
  }

  protected _translateLogicalOperator(operator: AppTestAccessablityLogicalOperator): string {
    switch (operator) {
      case AppTestAccessablityLogicalOperator.And:
        return 'И';
      case AppTestAccessablityLogicalOperator.Or:
        return 'ИЛИ';
      default:
        return 'Unknown';
    }
  }

  protected _handleClose(): void {
    this._ref.close(null);
  }

  protected _handleSubmit(): void {
    const { article, logicalOperator, test, type } = this._form.getRawValue();
    const result: Partial<AppTestAccessablityCondition> = {
      logicalOperator: logicalOperator!
    };
    if (type === 'test') {
      const t: Partial<AppTestAccessablityConditionTest> = {
        testId: test.testId!,
        type: 'test'
      };
      if (test.type === 'score') {
        t.data = { score: test.score!, type: 'score' };
      }
      else {
        t.data = { success: test.success!, type: 'succedded' };
      }
      merge(result, t);
    }
    if (type === 'article') {
      const a: Partial<AppTestAccessablityConditionArticle> = {
        articleId: article.articleId!,
        type: 'article'
      };
      if (article.isReaded) {
        a.isReaded = article.isReaded;
      }
      merge(result, a);
    }
    this._ref.close(result);
  }
}
