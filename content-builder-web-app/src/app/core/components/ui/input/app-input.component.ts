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
  selector: 'app-input',
  imports: [MatIcon, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppInputComponent),
      multi: true
    }
  ],
  template: `
    <div class="flex flex-col gap-1.5 w-full">
      @if (label()) {
        <label [for]="_inputId" class="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
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

      <div class="relative flex items-center w-full">
        @if (icon()) {
          <mat-icon
            [svgIcon]="icon()!"
            class="!w-4 !h-4 text-slate-400 dark:text-slate-500 absolute left-3 pointer-events-none shrink-0"
          />
        }

        <input
          [id]="_inputId"
          [type]="_effectiveType()"
          [placeholder]="placeholder()"
          [disabled]="_isDisabled()"
          [readonly]="readonly()"
          [autocomplete]="autocomplete() ?? null"
          [min]="min() ?? null"
          [max]="max() ?? null"
          [step]="step() ?? null"
          [value]="_innerValue()"
          (input)="onInputChange($event)"
          (blur)="onBlur()"
          (keydown.enter)="enter.emit()"
          [class]="_computedInputClasses()"
        />

        @if (type() === 'password' && togglePassword()) {
          <button
            type="button"
            (click)="_togglePasswordVisibility()"
            [attr.aria-label]="_isPasswordVisible() ? 'Скрыть пароль' : 'Показать пароль'"
            class="absolute right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer focus:outline-none"
          >
            <mat-icon [svgIcon]="_isPasswordVisible() ? 'eye-slash' : 'eye'" class="!w-3.5 !h-3.5 block" />
          </button>
        } @else if (clearable() && _innerValue() && !_isDisabled() && !readonly()) {
          <span
            role="button"
            tabindex="0"
            (keydown.enter)="clear()"
            (click)="clear()"
            class="absolute right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <mat-icon svgIcon="times" class="!w-3 !h-3 block" />
          </span>
        } @else if (suffixIcon()) {
          <mat-icon
            [svgIcon]="suffixIcon()!"
            class="!w-4 !h-4 text-slate-400 dark:text-slate-500 absolute right-3 pointer-events-none shrink-0"
          />
        }
      </div>

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
export class AppInputComponent implements ControlValueAccessor {
  private static _nextId = 0;
  protected readonly _inputId = `app-input-${++AppInputComponent._nextId}`;

  public readonly label = input<string | undefined>(undefined);
  public readonly placeholder = input<string>('');
  public readonly type = input<'text' | 'number' | 'password' | 'email' | 'tel' | 'url' | 'time' | 'date' | 'datetime-local' | 'search'>('text');
  public readonly icon = input<string | undefined>(undefined);
  public readonly suffixIcon = input<string | undefined>(undefined);
  public readonly clearable = input<boolean>(false);
  public readonly togglePassword = input<boolean>(false);
  public readonly autocomplete = input<string | undefined>(undefined);
  public readonly hint = input<string | null | undefined>(undefined);
  public readonly error = input<string | null | undefined>(undefined);
  public readonly badge = input<string | undefined>(undefined);
  public readonly required = input<boolean>(false);
  public readonly disabled = input<boolean>(false);
  public readonly readonly = input<boolean>(false);
  public readonly size = input<'sm' | 'md' | 'lg'>('md');
  public readonly min = input<number | string | undefined>(undefined);
  public readonly max = input<number | string | undefined>(undefined);
  public readonly step = input<number | string | undefined>(undefined);

  public readonly value = input<string | number | undefined>(undefined);

  public readonly valueChange = output<string>();
  public readonly enter = output<void>();
  public readonly cleared = output<void>();

  protected readonly _innerValue = signal<string>('');
  protected readonly _isDisabled = signal<boolean>(false);
  protected readonly _isPasswordVisible = signal<boolean>(false);

  protected readonly _effectiveType = computed(() => {
    if (this.type() === 'password' && this.togglePassword() && this._isPasswordVisible()) {
      return 'text';
    }
    return this.type();
  });

  private _onChange: (val: string) => void = () => {};
  private _onTouched: () => void = () => {};

  constructor() {
    // Sync direct input binding if provided
    effect(() => {
      const externalVal = this.value();
      if (externalVal !== undefined) {
        this._innerValue.set(String(externalVal));
      }
    }, { allowSignalWrites: true });

    effect(() => {
      this._isDisabled.set(this.disabled());
    }, { allowSignalWrites: true });
  }

  protected _togglePasswordVisibility(): void {
    this._isPasswordVisible.update(visible => !visible);
  }

  protected readonly _computedInputClasses = computed(() => {
    const base = 'w-full rounded-xl bg-white dark:bg-slate-900 border text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all outline-none focus:ring-2 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed';

    // Size
    let sizeClass = '';
    switch (this.size()) {
      case 'sm':
        sizeClass = 'h-8 text-xs';
        break;
      case 'lg':
        sizeClass = 'h-11 text-sm font-medium';
        break;
      case 'md':
      default:
        sizeClass = 'h-9 text-xs';
        break;
    }

    // Padding (accounting for prefix and suffix icons)
    const pl = this.icon() ? 'pl-9' : 'px-3.5';
    const hasSuffixAction = this.clearable() || this.suffixIcon() || (this.type() === 'password' && this.togglePassword());
    const pr = hasSuffixAction ? 'pr-9' : 'px-3.5';

    // State borders
    let borderClass = 'border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20';
    if (this.error()) {
      borderClass = 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20';
    }

    return `${base} ${sizeClass} ${pl} ${pr} ${borderClass}`;
  });

  public onInputChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this._innerValue.set(val);
    this._onChange(val);
    this.valueChange.emit(val);
  }

  public onBlur(): void {
    this._onTouched();
  }

  public clear(): void {
    this._innerValue.set('');
    this._onChange('');
    this.valueChange.emit('');
    this.cleared.emit();
  }

  // ControlValueAccessor implementation
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
