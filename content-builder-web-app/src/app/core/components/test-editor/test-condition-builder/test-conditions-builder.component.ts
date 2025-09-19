import { AppTestAccessablityCondition, AppTestAccessablityLogicalOperator, NullableValue } from '@/core/utils';
import { Component, computed, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatIconButton, MatMiniFabButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { TestConditionItemBuilderComponent } from '../test-condition-item-builder/test-condition-item-builder.component';
import { take } from 'rxjs';
import { Store } from '@ngxs/store';
import { ArticlesState, TestsState } from '@/core/store';
import { upperFirst } from 'lodash';
import { MatRipple } from '@angular/material/core';

type ControlValueType = AppTestAccessablityCondition[];

@Component({
  selector: 'app-test-conditions-builder',
  imports: [
    MatMiniFabButton,
    MatIcon,
    MatIconButton,
    MatRipple
  ],
  templateUrl: './test-conditions-builder.component.html',
  styles: ``,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: TestConditionsBuilderComponent,
      multi: true
    }
  ],
  host: {
    class: 'w-full block'
  }
})
export class TestConditionsBuilderComponent implements ControlValueAccessor {
  private _fn: NullableValue<(value: ControlValueType) => void>;
  private readonly _dialog = inject(MatDialog);
  private readonly _store = inject(Store);

  protected readonly _disabled = signal(false);
  protected readonly _conditions = signal<ControlValueType>([]);
  public readonly folderId = input.required<string>();
  public writeValue(obj: NullableValue<ControlValueType>): void {
    this._conditions.set(obj ?? []);
  }

  public registerOnChange(fn: (value: ControlValueType) => void): void {
    this._fn = fn;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public registerOnTouched(fn: (value: ControlValueType) => void): void {
    // this._fn = fn;
  }

  public setDisabledState?(isDisabled: boolean): void {
    this._disabled.set(isDisabled);
  }

  private _changed(): void {
    this._fn?.(this._conditions());
  }

  protected _humanizeCondition = computed(() => {
    const tests = this._store.selectSignal(TestsState.getTests)()(this.folderId());
    const articles = this._store.selectSignal(ArticlesState.getArticles)()(this.folderId());
    return (condition: AppTestAccessablityCondition, index: number): string => {
      const result: string[] = [];
      if (index > 0) {
        result.push(`${condition.logicalOperator === AppTestAccessablityLogicalOperator.And ? 'и' : 'или'}`);
      }
      if (condition.type === 'test') {
        result.push('тест');
        const test = tests.find(x => x.id === condition.testId);
        result.push(`[${test?.name}]`);
        if (condition.data.type === 'score') {
          result.push(`должен иметь не менее ${condition.data.score} баллов`);
        }
        else if (condition.data.type === 'succedded') {
          result.push(`должен быть ${condition.data.success ? 'успешным' : 'неуспешным'}`);
        }
      }

      if (condition.type === 'article') {
        const a = articles.find(x => x.id === condition.articleId);
        result.push(`статья [${a?.name}] должна быть ${condition.isReaded ? 'прочитанной' : 'непрочитанной'}`);
      }

      return upperFirst(result.join(' '));
    };
  });

  private _openCondition(c: NullableValue<AppTestAccessablityCondition>): void {
    this._dialog.open(TestConditionItemBuilderComponent, {
      width: '400px',
      hasBackdrop: true,
      disableClose: true,
      data: {
        folderId: this.folderId(),
        condition: c
      }
    })
      .afterClosed()
      .pipe(take(1))
      .subscribe((result: AppTestAccessablityCondition) => {
        if (result == null) {
          return;
        }
        this._conditions.update((prev) => {
          const index = prev.findIndex(x => x === c);
          if (index !== -1) {
            prev.splice(index, 1, result);
          }
          else {
            prev.push(result);
          }
          return [...prev];
        });
        this._changed();
      });
  }

  protected _handleEdit(c: AppTestAccessablityCondition): void {
    this._openCondition(c);
  }

  protected _handleDelete(c: AppTestAccessablityCondition): void {
    this._conditions.update(prev => prev.filter(x => x !== c));
    this._changed();
  }

  protected _handleCreate(): void {
    this._openCondition(null);
  }
}
