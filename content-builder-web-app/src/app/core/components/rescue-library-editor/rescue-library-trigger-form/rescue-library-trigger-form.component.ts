import { RescueLibraryTriggerVm, RescueLibraryItemVm, NullableValue } from '@/core/utils';
import { Component, computed, effect, inject, input, output, ViewContainerRef } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AppLoading, RescueLibraryActions, RescueLibraryState } from '@/core/store';
import { Store } from '@ngxs/store';
import { RescueLibraryItemSelectDialogComponent } from '../rescue-library-item-select-dialog';
import { take } from 'rxjs';

@Component({
  selector: 'app-rescue-library-trigger-form',
  imports: [
    MatIcon,
    MatButton,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './rescue-library-trigger-form.component.html',
  styles: ``
})
export class RescueLibraryTriggerFormComponent {
  private readonly _dispatched = inject(AppLoading);
  private readonly _store = inject(Store);
  private readonly _dialog = inject(MatDialog);
  private readonly _vcr = inject(ViewContainerRef);

  selectedItem = input.required<RescueLibraryTriggerVm>();
  submitEvent = output<RescueLibraryTriggerVm>();

  protected readonly _form = new FormGroup({
    name: new FormControl<string>('', Validators.required),
    description: new FormControl<string>(''),
    rescueLibraryItemId: new FormControl<NullableValue<string>>(null)
  });

  protected readonly _selectedLibraryItem = computed(() => {
    const itemId = this._form.value.rescueLibraryItemId;
    if (!itemId) {
      return null;
    }
    const allItems = this._store.selectSignal(RescueLibraryState.getAllRescueLibraryItems)();
    return allItems.find(x => x.id === itemId) ?? null;
  });

  protected readonly _getTypeLabel = (type: string): string => {
    switch (type) {
      case 'folder':
        return 'Папка';
      case 'test':
        return 'Тест';
      case 'question':
        return 'Вопрос';
      case 'medicine':
        return 'Лекарство';
      case 'trigger':
        return 'Триггер';
      default:
        return 'Неизвестно';
    }
  };

  protected readonly _getIconForType = (type: string): string => {
    switch (type) {
      case 'folder':
        return 'folder';
      case 'test':
        return 'file-circle-check';
      case 'question':
        return 'file-contract';
      case 'medicine':
        return 'kit-medical';
      case 'trigger':
        return 'bolt';
      default:
        return 'file-contract';
    }
  };

  protected readonly _isPending = this._dispatched.isDispatched(RescueLibraryActions.UpdateRescueLibraryItem);

  constructor() {
    effect(() => {
      const item = this.selectedItem();
      if (item) {
        this._form.reset({
          name: item.name ?? '',
          description: item.description ?? '',
          rescueLibraryItemId: item.data?.rescueLibraryItemId ?? null
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

    const { name, description, rescueLibraryItemId } = this._form.value;
    const item = this.selectedItem();
    this.submitEvent.emit({
      ...item,
      name: name!,
      description: description ?? undefined,
      data: {
        buttonType: 'button',
        rescueLibraryItemId: rescueLibraryItemId ?? undefined
      }
    });
  }

  protected _openSelectDialog(): void {
    const currentItemId = this._form.value.rescueLibraryItemId;
    this._dialog.open(RescueLibraryItemSelectDialogComponent, {
      width: '600px',
      height: '400px',
      hasBackdrop: true,
      viewContainerRef: this._vcr,
      disableClose: false,
      data: {
        selectedItemId: currentItemId
      }
    })
      .afterClosed()
      .pipe(take(1))
      .subscribe((result: RescueLibraryItemVm | undefined) => {
        if (result) {
          this._form.patchValue({
            rescueLibraryItemId: result.id
          });
          this._form.controls.rescueLibraryItemId.markAsDirty();
        }
      });
  }
}
