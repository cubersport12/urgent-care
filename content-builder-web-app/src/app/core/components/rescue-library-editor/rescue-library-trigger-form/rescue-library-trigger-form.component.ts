import { RescueLibraryTriggerVm, RescueLibraryItemVm, NullableValue } from '@/core/utils';
import { Component, computed, effect, inject, input, output, ViewContainerRef } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AppLoading, RescueLibraryActions, RescueLibraryState } from '@/core/store';
import { Store } from '@ngxs/store';
import { RescueLibraryItemSelectDialogComponent } from '../rescue-library-item-select-dialog';
import { SvgIconInputDialogComponent } from './svg-icon-input-dialog';
import { take } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-rescue-library-trigger-form',
  imports: [
    MatIcon,
    MatButton,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './rescue-library-trigger-form.component.html',
  styles: `
    .icon-preview {
      width: 32px;
    }
  `
})
export class RescueLibraryTriggerFormComponent {
  private readonly _dispatched = inject(AppLoading);
  private readonly _store = inject(Store);
  private readonly _dialog = inject(MatDialog);
  private readonly _vcr = inject(ViewContainerRef);
  private readonly _sanitizer = inject(DomSanitizer);

  selectedItem = input.required<RescueLibraryTriggerVm>();
  submitEvent = output<RescueLibraryTriggerVm>();

  protected readonly _form = new FormGroup({
    name: new FormControl<string>('', Validators.required),
    description: new FormControl<string>(''),
    rescueLibraryItemId: new FormControl<NullableValue<string>>(null),
    buttonType: new FormControl<'button' | 'toggle'>('button', Validators.required),
    onSvg: new FormControl<string>(''),
    offSvg: new FormControl<string>('')
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
      case 'params-state':
        return 'Панель состояния параметров';
      case 'folder-container':
        return 'Контейнер папки';
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
      case 'params-state':
        return 'chart-line';
      case 'folder-container':
        return 'layer-group';
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
          rescueLibraryItemId: item.data?.rescueLibraryItemId ?? null,
          buttonType: item.data?.buttonType ?? 'button',
          onSvg: item.data?.onSvg ?? '',
          offSvg: item.data?.offSvg ?? ''
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

    const { name, description, rescueLibraryItemId, buttonType, onSvg, offSvg } = this._form.value;
    const item = this.selectedItem();
    this.submitEvent.emit({
      ...item,
      name: name!,
      description: description ?? undefined,
      data: {
        buttonType: buttonType ?? 'button',
        rescueLibraryItemId: rescueLibraryItemId ?? undefined,
        onSvg: buttonType === 'toggle' && onSvg ? onSvg : undefined,
        offSvg: buttonType === 'toggle' && offSvg ? offSvg : undefined
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

  protected _openSvgIconDialog(field: 'onSvg' | 'offSvg'): void {
    const currentValue = this._form.value[field] ?? '';
    const title = field === 'onSvg' ? 'Иконка для состояния ON' : 'Иконка для состояния OFF';

    this._dialog.open(SvgIconInputDialogComponent, {
      width: '600px',
      height: '500px',
      hasBackdrop: true,
      viewContainerRef: this._vcr,
      disableClose: false,
      data: {
        initialValue: currentValue,
        title
      }
    })
      .afterClosed()
      .pipe(take(1))
      .subscribe((result: string | undefined) => {
        if (result !== undefined) {
          this._form.patchValue({
            [field]: result
          });
          this._form.controls[field].markAsDirty();
        }
      });
  }

  protected get _sanitizedOnSvg() {
    const svg = this._form.value.onSvg;
    if (!svg) {
      return null;
    }
    return this._sanitizer.bypassSecurityTrustHtml(svg); // 1 = SecurityContext.HTML
  };

  protected get _sanitizedOffSvg() {
    const svg = this._form.value.offSvg;
    if (!svg) {
      return null;
    }
    return this._sanitizer.bypassSecurityTrustHtml(svg); // 1 = SecurityContext.HTML
  }
}
