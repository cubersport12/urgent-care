import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  forwardRef,
  input,
  output,
  signal
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-textarea',
  imports: [MatIcon, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppTextareaComponent),
      multi: true
    }
  ],
  template: `
    <div class="flex flex-col gap-1.5 w-full">
      @if (label()) {
        <label [for]="_textareaId" class="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
          <span>
            {{ label() }}
            @if (required()) {
              <span class="text-rose-500 ml-0.5">*</span>
            }
          </span>
          @if (badge()) {
            <span class="text-[10px] font-normal text-slate-400">{{ badge() }}</span>
          }
        </label>
      }

      <textarea
        [id]="_textareaId"
        [rows]="rows()"
        [placeholder]="placeholder()"
        [disabled]="_isDisabled()"
        [readonly]="readonly()"
        [value]="_innerValue()"
        (input)="onInputChange($event)"
        (blur)="onBlur()"
        [class]="_computedClasses()"
      ></textarea>

      @if (error()) {
        <p class="text-[11px] text-rose-600 dark:text-rose-400 m-0 flex items-center gap-1">
          <mat-icon svgIcon="exclamation-circle" class="!w-3 !h-3 shrink-0" />
          <span>{{ error() }}</span>
        </p>
      } @else if (hint()) {
        <p class="text-[11px] text-slate-400 dark:text-slate-500 m-0">
          {{ hint() }}
        </p>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppTextareaComponent implements ControlValueAccessor {
  private static _nextId = 0;
  protected readonly _textareaId = `app-textarea-${++AppTextareaComponent._nextId}`;

  public readonly label = input<string | undefined>(undefined);
  public readonly placeholder = input<string>('');
  public readonly rows = input<number>(3);
  public readonly hint = input<string | undefined>(undefined);
  public readonly error = input<string | undefined>(undefined);
  public readonly badge = input<string | undefined>(undefined);
  public readonly required = input<boolean>(false);
  public readonly disabled = input<boolean>(false);
  public readonly readonly = input<boolean>(false);

  public readonly value = input<string | undefined>(undefined);

  public readonly valueChange = output<string>();

  protected readonly _innerValue = signal<string>('');
  protected readonly _isDisabled = signal<boolean>(false);

  private _onChange: (val: string) => void = () => {};
  private _onTouched: () => void = () => {};

  constructor() {
    effect(() => {
      const externalVal = this.value();
      if (externalVal !== undefined) {
        this._innerValue.set(externalVal);
      }
    }, { allowSignalWrites: true });

    effect(() => {
      this._isDisabled.set(this.disabled());
    }, { allowSignalWrites: true });
  }

  protected readonly _computedClasses = computed(() => {
    const base = 'w-full rounded-xl bg-white dark:bg-slate-900 border p-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all outline-none focus:ring-2 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed resize-y';

    let borderClass = 'border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20';
    if (this.error()) {
      borderClass = 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20';
    }

    return `${base} ${borderClass}`;
  });

  public onInputChange(event: Event): void {
    const val = (event.target as HTMLTextAreaElement).value;
    this._innerValue.set(val);
    this._onChange(val);
    this.valueChange.emit(val);
  }

  public onBlur(): void {
    this._onTouched();
  }

  // ControlValueAccessor
  public writeValue(obj: any): void {
    this._innerValue.set(obj != null ? String(obj) : '');
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
