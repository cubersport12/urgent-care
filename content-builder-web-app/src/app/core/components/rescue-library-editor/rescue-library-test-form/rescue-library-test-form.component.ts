import { RescueLibraryTestVm, NullableValue } from '@/core/utils';
import { Component, computed, effect, inject, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AppLoading, TestsActions, TestsState, RescueLibraryActions } from '@/core/store';
import { Store } from '@ngxs/store';
import { TestsEditorService } from '../../test-editor';

@Component({
  selector: 'app-rescue-library-test-form',
  imports: [
    MatIcon,
    MatButton,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './rescue-library-test-form.component.html',
  styles: ``
})
export class RescueLibraryTestFormComponent {
  private readonly _store = inject(Store);
  private readonly _dispatched = inject(AppLoading);
  private readonly _testsEditor = inject(TestsEditorService);

  selectedItem = input.required<RescueLibraryTestVm>();
  submitEvent = output<RescueLibraryTestVm>();
  testCreatedOrEdited = output<void>();

  protected readonly _form = new FormGroup({
    name: new FormControl<string>('', Validators.required),
    description: new FormControl<string>(''),
    testId: new FormControl<NullableValue<string>>(null)
  });

  protected readonly _allTests = computed(() => {
    return this._store.selectSignal(TestsState.getAllTests)();
  });

  protected readonly _isPending = this._dispatched.isDispatched(RescueLibraryActions.UpdateRescueLibraryItem);

  constructor() {
    // Загружаем все тесты для выпадающего списка
    this._store.dispatch(new TestsActions.FetchAllTests());

    effect(() => {
      const item = this.selectedItem();
      if (item) {
        this._form.reset({
          name: item.name ?? '',
          description: item.description ?? '',
          testId: item.data?.testId ?? null
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

    const { name, description, testId } = this._form.value;
    this.submitEvent.emit({
      ...this.selectedItem() ?? {},
      name: name!,
      description: description ?? undefined,
      data: {
        ...this.selectedItem()?.data ?? {},
        testId: testId ?? ''
      }
    });
  }

  protected _handleCreateOrEditTest(): void {
    const item = this.selectedItem();
    if (!item) {
      return;
    }

    const testId = item.data?.testId;

    if (testId) {
      // Редактируем существующий тест
      const allTests = this._allTests();
      const test = allTests.find(t => t.id === testId);
      if (test) {
        // Сохраняем hidden = true при редактировании
        this._testsEditor.openTest({ ...test, hidden: test.hidden ?? true });
        this.testCreatedOrEdited.emit();
      }
    }
    else {
      // Создаем новый тест с hidden = true
      this._testsEditor.openTest({
        parentId: item.parentId ?? undefined,
        hidden: true
      });
      this.testCreatedOrEdited.emit();
    }
  }
}
