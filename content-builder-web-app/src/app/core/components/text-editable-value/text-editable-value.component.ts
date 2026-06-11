import { BaseControlValueAccessor } from '@/core/utils';
import { Component, effect, ElementRef, HostListener, model, output, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-text-editable-value',
  imports: [
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './text-editable-value.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: TextEditableValueComponent,
      multi: true
    }
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  host: {
    class: 'w-full block'
  }
})
export class TextEditableValueComponent extends BaseControlValueAccessor<string> {
  private readonly _target = viewChild<ElementRef<HTMLInputElement>>('input');

  public readonly editing = model.required<boolean>();
  public readonly beginRenaming = output<void>();
  public readonly endRenaming = output<void>();

  constructor() {
    super();
    effect(() => {
      const editing = this.editing();
      if (editing) {
        setTimeout(() => {
          this._target()?.nativeElement.focus();
        }, 50);
      }
    });
  }

  protected _confirmRename(): void {
    if (!this.editing()) {
      return;
    }
    const input = this._target()?.nativeElement;
    this._valueChanged(input?.value ?? '');
    this._stopEditing();
  }

  protected _cancelRename(): void {
    this._stopEditing();
  }

  private _stopEditing(): void {
    this.editing.set(false);
    this.endRenaming.emit();
  }

  @HostListener('document:click', ['$event'])
  public _onDocumentClick(event: MouseEvent): void {
    if (!this.editing()) {
      return;
    }
    const input = this._target()?.nativeElement;
    if (event.target === input || input?.contains(event.target as Node)) {
      return;
    }
    this._confirmRename();
  }

  protected _beginRename(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.editing.set(true);
    this.beginRenaming.emit();
  }
}
