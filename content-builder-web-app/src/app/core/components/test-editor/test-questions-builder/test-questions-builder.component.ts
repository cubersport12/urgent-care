import { AppTestQuestionVm, NullableValue } from '@/core/utils';
import { Component, inject, Injector, input, signal, ViewContainerRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatMiniFabButton, MatIconButton, MatButton } from '@angular/material/button';
import { MatRipple } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { TestQuestionItemBuilderComponent } from '../test-question-item-builder/test-question-item-builder.component';
import { take } from 'rxjs';
import { cloneDeep, sum, sumBy } from 'lodash';
import { NgClass } from '@angular/common';
import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { TestEditorComponent } from '../test-editor.component';

type ControlValueType = AppTestQuestionVm[];

@Component({
  selector: 'app-test-questions-builder',
  imports: [
    MatMiniFabButton,
    MatIcon,
    MatIconButton,
    MatRipple,
    MatTableModule,
    MatButton,
    NgClass,
    CdkDropList,
    CdkDrag
  ],
  templateUrl: './test-questions-builder.component.html',
  styles: `
    .cdk-drag-preview {
      box-sizing: border-box;
      border-radius: 4px;
      box-shadow: 0 5px 5px -3px rgba(0, 0, 0, 0.2),
        0 8px 10px 1px rgba(0, 0, 0, 0.14),
        0 3px 14px 2px rgba(0, 0, 0, 0.12);
      background-color: white;
    }
    .cdk-drag-placeholder {
      opacity: 0;
    }
    .example-drag-cursor {
      cursor: move;
    }
    .cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }

    .cdk-drop-list-dragging .mat-row:not(.cdk-drag-placeholder) {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
  `,
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
  private readonly _testEditor = inject(TestEditorComponent);
  private readonly _dialog = inject(MatDialog);
  private readonly _injector = inject(Injector);
  private readonly _vcr = inject(ViewContainerRef);

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
      width: 'calc(80% + 100px)',
      hasBackdrop: true,
      viewContainerRef: this._vcr,
      injector: this._injector,
      disableClose: true,
      data: {
        folderId: this.folderId(),
        question: q ? cloneDeep(q) : q,
        questions: this._questions()
      }
    })
      .afterClosed()
      .pipe(take(1))
      .subscribe((result: AppTestQuestionVm & { file?: File }) => {
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
    if (q.image) {
      this._testEditor.addToRemoveFile(q.image);
    }
    this._changed();
  }

  protected _handleCreate(): void {
    this._openQuestion(null);
  }

  protected _handleQuestionDrop(event: CdkDragDrop<AppTestQuestionVm[]>): void {
    this._questions.update((p) => {
      const newP = [...p];
      moveItemInArray(newP, event.previousIndex, event.currentIndex);
      newP.forEach((question, index) => {
        question.order = index;
      });
      return newP;
    });
    this._changed();
  }

  protected _getQuestionInfoTest(q: AppTestQuestionVm): string {
    const result: string[] = [];
    if (q.activationCondition != null) {
      result.push('Вопрос с условием активации');
    }
    else {
      // result.push('Обычный вопрос');
    }
    if (q.answers != null && q.answers.length > 0) {
      result.push('Ответов - ' + q.answers.length);

      const correctAnswersCount = q.answers.filter(x => x.isCorrect).length;
      if (correctAnswersCount > 0) {
        result.push('Корректных ответов - ' + correctAnswersCount);
      }

      const scores = sum(q.answers.map(x => x.score ?? 0));
      result.push('Всего баллов - ' + scores);
    }
    return result.join('. ');
  }
}
