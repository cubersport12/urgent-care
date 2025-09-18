import { AppTestAccessablityCondition, AppTestAccessablityLogicalOperator, NullableValue } from '@/core/utils';
import { Component, computed, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatMiniFabButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { TestConditionItemBuilderComponent } from '../test-condition-item-builder/test-condition-item-builder.component';
import { take } from 'rxjs';
import { Store } from '@ngxs/store';
import { ArticlesState, TestsState } from '@/core/store';
import { upperFirst } from 'lodash';

type ControlValueType = AppTestAccessablityCondition[];

@Component({
  selector: 'app-test-conditions-builder',
  imports: [
    MatMiniFabButton,
    MatIcon
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
    // const articles = this._store.selectSignal(ArticlesState.getArticles)()(this.folderId());
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

      return upperFirst(result.join(' '));
    };
  });

  protected _handleCreate(): void {
    this._dialog.open(TestConditionItemBuilderComponent, {
      width: '400px',
      hasBackdrop: true,
      disableClose: true,
      data: {
        folderId: this.folderId()
      }
    })
      .afterClosed()
      .pipe(take(1))
      .subscribe((c: AppTestAccessablityCondition) => {
        this._conditions.update(prev => [...prev, c]);
        this._changed();
      });
  }
}
