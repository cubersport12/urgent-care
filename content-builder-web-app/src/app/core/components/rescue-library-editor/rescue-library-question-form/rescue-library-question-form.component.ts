import { RescueLibraryQuestionVm, AppTestQuestionVm } from '@/core/utils';
import { Component, effect, inject, input, output, ViewContainerRef, Injector } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AppLoading, RescueLibraryActions } from '@/core/store';
import { MatDialog } from '@angular/material/dialog';
import { TestQuestionItemBuilderComponent } from '../../test-editor/test-question-item-builder/test-question-item-builder.component';
import { take } from 'rxjs';
import { cloneDeep } from 'lodash';

@Component({
  selector: 'app-rescue-library-question-form',
  imports: [
    MatIcon,
    MatButton,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './rescue-library-question-form.component.html',
  styles: ``
})
export class RescueLibraryQuestionFormComponent {
  private readonly _dispatched = inject(AppLoading);
  private readonly _dialog = inject(MatDialog);
  private readonly _injector = inject(Injector);
  private readonly _vcr = inject(ViewContainerRef);

  selectedItem = input.required<RescueLibraryQuestionVm>();
  submitEvent = output<RescueLibraryQuestionVm>();
  questionCreatedOrEdited = output<void>();

  protected readonly _form = new FormGroup({
    name: new FormControl<string>('', Validators.required),
    description: new FormControl<string>('')
  });

  protected readonly _isPending = this._dispatched.isDispatched(RescueLibraryActions.UpdateRescueLibraryItem);

  constructor() {
    effect(() => {
      const item = this.selectedItem();
      if (item) {
        this._form.reset({
          name: item.name ?? '',
          description: item.description ?? ''
        });
      }
    });

    effect(() => {
      const isPending = this._isPending();
      if (isPending) {
        this._form.disable();
      }
      else {
        this._form.enable();
      }
    });
  }

  protected _handleSubmit(): void {
    if (this._form.invalid || !this._form.dirty) {
      return;
    }

    const { name, description } = this._form.value;
    const item = this.selectedItem();
    this.submitEvent.emit({
      ...item,
      name: name!,
      description: description ?? undefined
    });
  }

  protected _hasQuestion(): boolean {
    const item = this.selectedItem();
    return !!(item?.data?.question);
  }

  protected _handleCreateOrEditQuestion(): void {
    const item = this.selectedItem();
    if (!item) {
      return;
    }

    const question = item.data?.question;

    this._dialog.open(TestQuestionItemBuilderComponent, {
      width: 'calc(80% + 100px)',
      hasBackdrop: true,
      viewContainerRef: this._vcr,
      injector: this._injector,
      disableClose: true,
      data: {
        folderId: item.parentId ?? '',
        question: question ? cloneDeep(question) : null,
        questions: [] // Пустой массив, так как мы редактируем отдельный вопрос
      }
    })
      .afterClosed()
      .pipe(take(1))
      .subscribe((result: AppTestQuestionVm & { files?: Map<string, Blob> } | null) => {
        if (result == null) {
          return;
        }

        // Обрабатываем файлы, если они есть (когда TestEditorComponent отсутствует)
        const { files, ...questionData } = result;

        // Если есть файлы, сохраняем их
        if (files && files.size > 0) {
          // TODO: Сохранить файлы через AppFilesStorageService
          // Пока что файлы не сохраняются, если нет TestEditorComponent
          console.warn('Файлы требуют сохранения, но TestEditorComponent отсутствует');
        }

        // Обновляем data в элементе библиотеки
        const updatedItem: RescueLibraryQuestionVm = {
          ...item,
          data: {
            question: questionData
          }
        };

        this.submitEvent.emit(updatedItem);
        this.questionCreatedOrEdited.emit();
      });
  }
}
