import { BaseControlValueAccessor } from '@/core/utils';
import { Component, effect, ElementRef, HostListener, model, output, viewChild } from '@angular/core';
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
  styles: ``
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
    const input = this._target()?.nativeElement;
    this._valueChanged(input?.value ?? '');
    this._endRename();
  }

  protected _cancelRename(): void {
    this._endRename();
  }

  @HostListener('document:click', ['$event'])
  private _endRename(event?: MouseEvent): void {
    const input = this._target()?.nativeElement;
    if (event?.target === input) {
      return;
    };
    this.editing.set(false);
    this.endRenaming.emit();
  }

  protected _beginRename(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.editing.set(true);
    this.beginRenaming.emit();
  }
}
