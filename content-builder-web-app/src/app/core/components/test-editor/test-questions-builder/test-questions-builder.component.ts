import { AppTestQuestionVm, NullableValue } from '@/core/utils';
import { Component, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatMiniFabButton, MatIconButton, MatButton } from '@angular/material/button';
import { MatRipple } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { TestQuestionItemBuilderComponent } from '../test-question-item-builder/test-question-item-builder.component';
import { take } from 'rxjs';
import { cloneDeep } from 'lodash';

type ControlValueType = AppTestQuestionVm[];

@Component({
  selector: 'app-test-questions-builder',
  imports: [
    MatMiniFabButton,
    MatIcon,
    MatIconButton,
    MatRipple,
    MatTableModule,
    MatButton
  ],
  templateUrl: './test-questions-builder.component.html',
  styles: ``,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: TestQuestionsBuilderComponent,
      multi: true
    }
  ],
  host: {
    class: 'w-full block grow overflow-hidden'
  }
})
export class TestQuestionsBuilderComponent implements ControlValueAccessor {
  private _fn: NullableValue<(value: ControlValueType) => void>;
  private readonly _dialog = inject(MatDialog);

  protected readonly _disabled = signal(false);
  protected readonly _questions = signal<ControlValueType>([]);

  public readonly folderId = input.required<string>();

  public writeValue(obj: ControlValueType): void {
    this._questions.set(obj);
  }

  public registerOnChange(fn: (value: ControlValueType) => void): void {
    this._fn = fn;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public registerOnTouched(fn: (value: ControlValueType) => void): void {
    // throw new Error('Method not implemented.');
  }

  public setDisabledState?(isDisabled: boolean): void {
    this._disabled.set(isDisabled);
  }

  private _changed(): void {
    this._fn?.(this._questions());
  }

  private _openQuestion(q: NullableValue<AppTestQuestionVm>): void {
    this._dialog.open(TestQuestionItemBuilderComponent, {
      width: '80%',
      hasBackdrop: true,
      disableClose: true,
      data: {
        folderId: this.folderId(),
        question: q ? cloneDeep(q) : q
      }
    })
      .afterClosed()
      .pipe(take(1))
      .subscribe((result: AppTestQuestionVm) => {
        if (result == null) {
          return;
        }
        this._questions.update((prev) => {
          const index = prev.findIndex(x => x === q);
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

  protected _handleEdit(q: AppTestQuestionVm): void {
    this._openQuestion(q);
  }

  protected _handleDelete(q: AppTestQuestionVm): void {
    this._questions.update((prev) => {
      const index = prev.findIndex(x => x === q);
      if (index !== -1) {
        prev.splice(index, 1);
      }
      return [...prev];
    });
    this._changed();
  }

  protected _handleCreate(): void {
    this._openQuestion(null);
  }
}
