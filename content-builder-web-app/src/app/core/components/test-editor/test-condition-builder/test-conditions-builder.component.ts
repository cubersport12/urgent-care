import { AppTestAccessablityCondition, NullableValue } from '@/core/utils';
import { Component, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

type ControlValueType = AppTestAccessablityCondition[];

@Component({
  selector: 'app-test-conditions-builder',
  imports: [],
  templateUrl: './test-conditions-builder.component.html',
  styles: ``,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: TestConditionsBuilderComponent,
      multi: true
    }
  ]
})
export class TestConditionsBuilderComponent implements ControlValueAccessor {
  private _fn: NullableValue<(value: ControlValueType) => void>;
  protected readonly _disabled = signal(false);
  protected readonly _conditions = signal<ControlValueType>([]);
  public writeValue(obj: NullableValue<ControlValueType>): void {
    this._conditions.set(obj ?? []);
  }

  public registerOnChange(fn: (value: ControlValueType) => void): void {
    this._fn = fn;
  }

  public registerOnTouched(fn: (value: ControlValueType) => void): void {
    this._fn = fn;
  }

  public setDisabledState?(isDisabled: boolean): void {
    this._disabled.set(isDisabled);
  }
}
