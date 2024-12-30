import { Directive, model, output, signal } from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import { NullableValue } from './types';

type ControlValueAccessorFn<T> = (value: T) => void;

@Directive()
export class BaseControlValueAccessor<T> implements ControlValueAccessor {
  private _fn: NullableValue<(value: T) => void>;
  public readonly value = model<NullableValue<T>>(null);
  public readonly valueChange = output<NullableValue<T>>();
  public readonly disabled = model<boolean>();

  protected _valueChanged(value: T): void {
    this._fn?.(value);
    this.valueChange.emit(value);
  }

  public writeValue(obj: T): void {
    this.value.set(obj);
  }

  public registerOnChange(fn: ControlValueAccessorFn<T>): void {
    this._fn = fn;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  public registerOnTouched(fn: any): void {
  }

  public setDisabledState?(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
