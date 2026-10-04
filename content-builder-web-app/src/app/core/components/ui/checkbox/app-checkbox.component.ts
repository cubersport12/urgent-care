import {
  ChangeDetectionStrategy,
  Component,
  effect,
  forwardRef,
  input,
  output,
  signal
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-checkbox',
  imports: [MatIcon],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppCheckboxComponent),
      multi: true
    }
  ],
  template: `
    <label
      class="inline-flex items-start gap-2.5 select-none cursor-pointer group"
      [class.opacity-50]="_isDisabled()"
      [class.pointer-events-none]="_isDisabled()"
    >
      <div class="relative flex items-center justify-center shrink-0 mt-0.5">
        <input
          type="checkbox"
          class="sr-only"
          [checked]="_checked()"
          [disabled]="_isDisabled()"
          (change)="onToggle($event)"
        />
        <div
          class="w-4 h-4 rounded-md border flex items-center justify-center transition-all duration-150"
          [class.bg-blue-600]="_checked()"
          [class.border-blue-600]="_checked()"
          [class.bg-white]="!_checked()"
          [class.dark:bg-slate-900]="!_checked()"
          [class.border-slate-300]="!_checked()"
          [class.dark:border-slate-700]="!_checked()"
          [class.group-hover:border-blue-500]="!_isDisabled()"
        >
          @if (_checked()) {
            <mat-icon svgIcon="check" class="!w-3 !h-3 text-white" />
          }
        </div>
      </div>

      <div class="flex flex-col min-w-0">
        @if (label()) {
          <span class="text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white leading-tight">
            {{ label() }}
          </span>
        }
        @if (description()) {
          <span class="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-tight">
            {{ description() }}
          </span>
        }
        <ng-content></ng-content>
      </div>
    </label>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppCheckboxComponent implements ControlValueAccessor {
  public readonly label = input<string>('');
  public readonly description = input<string | undefined>(undefined);
  public readonly disabled = input<boolean>(false);

  public readonly checked = input<boolean | undefined>(undefined);
  public readonly checkedChange = output<boolean>();

  protected readonly _checked = signal<boolean>(false);
  protected readonly _isDisabled = signal<boolean>(false);

  private _onChange: (val: boolean) => void = () => {};
  private _onTouched: () => void = () => {};

  constructor() {
    effect(() => {
      const externalVal = this.checked();
      if (externalVal !== undefined) {
        this._checked.set(externalVal);
      }
    }, { allowSignalWrites: true });

    effect(() => {
      this._isDisabled.set(this.disabled());
    }, { allowSignalWrites: true });
  }

  public onToggle(event: Event): void {
    if (this._isDisabled()) return;
    const newVal = (event.target as HTMLInputElement).checked;
    this._checked.set(newVal);
    this._onChange(newVal);
    this._onTouched();
    this.checkedChange.emit(newVal);
  }

  // ControlValueAccessor
  public writeValue(obj: any): void {
    this._checked.set(Boolean(obj));
  }

  public registerOnChange(fn: any): void {
    this._onChange = fn;
  }

  public registerOnTouched(fn: any): void {
    this._onTouched = fn;
  }

  public setDisabledState(isDisabled: boolean): void {
    this._isDisabled.set(isDisabled);
  }
}
