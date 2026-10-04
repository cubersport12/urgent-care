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

export interface AppSelectOption<T = any> {
  value: T;
  label: string;
  icon?: string;
  badge?: string;
  disabled?: boolean;
  description?: string;
}

export type SelectOption<T = any> = AppSelectOption<T>;

@Component({
  selector: 'app-select',
  imports: [MatIcon, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppSelectComponent),
      multi: true
    }
  ],
  template: `
    <div class="flex flex-col gap-1.5 w-full">
      @if (label()) {
        <label [for]="_selectId" class="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
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

        <select
          [id]="_selectId"
          [disabled]="_isDisabled()"
          [multiple]="multiple()"
          [value]="multiple() ? undefined : _innerValue()"
          (change)="onSelectChange($event)"
          (blur)="onBlur()"
          [class]="_computedSelectClasses()"
        >
          @if (allowEmpty() && !multiple()) {
            <option [value]="emptyValue()" class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
              {{ emptyLabel() }}
            </option>
          }

          @for (opt of options(); track opt.value) {
            <option
              [value]="opt.value"
              [selected]="multiple() ? isSelected(opt.value) : undefined"
              [disabled]="opt.disabled"
              class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1"
            >
              {{ opt.label }}{{ opt.description ? ' (' + opt.description + ')' : '' }}
            </option>
          }
        </select>

        @if (!multiple()) {
          <mat-icon
            svgIcon="chevron-down"
            class="!w-3 !h-3 text-slate-400 dark:text-slate-500 absolute right-3 pointer-events-none shrink-0"
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
export class AppSelectComponent implements ControlValueAccessor {
  private static _nextId = 0;
  protected readonly _selectId = `app-select-${++AppSelectComponent._nextId}`;

  public readonly label = input<string | undefined>(undefined);
  public readonly options = input<AppSelectOption[]>([]);
  public readonly placeholder = input<string>('Выберите значение...');
  public readonly icon = input<string | undefined>(undefined);
  public readonly hint = input<string | undefined>(undefined);
  public readonly error = input<string | undefined>(undefined);
  public readonly badge = input<string | undefined>(undefined);
  public readonly required = input<boolean>(false);
  public readonly disabled = input<boolean>(false);
  public readonly multiple = input<boolean>(false);
  public readonly size = input<'sm' | 'md' | 'lg'>('md');
  public readonly allowEmpty = input<boolean>(false);
  public readonly emptyLabel = input<string>('Не выбрано');
  public readonly emptyValue = input<any>('');

  public readonly value = input<any>(undefined);

  public readonly valueChange = output<any>();

  protected readonly _innerValue = signal<any>('');
  protected readonly _isDisabled = signal<boolean>(false);

  private _onChange: (val: any) => void = () => {};
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

  protected isSelected(optVal: any): boolean {
    const val = this._innerValue();
    return Array.isArray(val) && val.includes(optVal);
  }

  protected readonly _computedSelectClasses = computed(() => {
    const base = 'w-full rounded-xl bg-white dark:bg-slate-900 border text-slate-900 dark:text-white transition-all outline-none focus:ring-2 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed cursor-pointer';

    // Border
    let borderClass = 'border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20';
    if (this.error()) {
      borderClass = 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20';
    }

    if (this.multiple()) {
      return `${base} min-h-[90px] p-2 text-xs ${borderClass}`;
    }

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

    // Padding
    const pl = this.icon() ? 'pl-9' : 'px-3.5';
    const pr = 'pr-9';

    return `${base} appearance-none ${sizeClass} ${pl} ${pr} ${borderClass}`;
  });

  public onSelectChange(event: Event): void {
    if (this.multiple()) {
      const select = event.target as HTMLSelectElement;
      const values = Array.from(select.selectedOptions).map((o) => o.value);
      this._innerValue.set(values);
      this._onChange(values);
      this.valueChange.emit(values);
      return;
    }
    const val = (event.target as HTMLSelectElement).value;
    this._innerValue.set(val);
    this._onChange(val);
    this.valueChange.emit(val);
  }

  public onBlur(): void {
    this._onTouched();
  }

  // ControlValueAccessor
  public writeValue(obj: any): void {
    if (this.multiple()) {
      this._innerValue.set(Array.isArray(obj) ? obj : []);
    } else {
      this._innerValue.set(obj != null ? obj : '');
    }
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
