import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AppRescueItemParameterVm, AppRescueItemParameterDiscriminatorByTimerVm } from '@/core/utils';
import { CommonModule } from '@angular/common';

export interface RescueParameterDialogData {
  parameter?: AppRescueItemParameterVm;
}

@Component({
  selector: 'app-rescue-parameter-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButton,
    MatDialogModule
  ],
  template: `
    <div class="flex flex-col gap-4 p-4" style="min-width: 400px;">
      <h2 mat-dialog-title>{{ data.parameter ? 'Редактировать параметр' : 'Добавить параметр' }}</h2>

      <form [formGroup]="_form" class="flex flex-col gap-4">
        <mat-form-field appearance="fill">
          <mat-label>Название</mat-label>
          <input matInput [formControl]="_form.controls.label" placeholder="Введите название параметра">
          @if (_form.controls.label.hasError('required')) {
            <mat-error>Название обязательно</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="fill">
          <mat-label>Категория</mat-label>
          <mat-select [formControl]="_form.controls.category">
            <mat-option value="number">Числовое</mat-option>
            <mat-option value="duration">Длительность</mat-option>
          </mat-select>
          @if (_form.controls.category.hasError('required')) {
            <mat-error>Категория обязательна</mat-error>
          }
        </mat-form-field>

        @if (_isDuration) {
          <mat-form-field appearance="fill">
            <mat-label>Длительность (HH:mm:ss)</mat-label>
            <input
              matInput
              type="time"
              step="1"
              [formControl]="_form.controls.timeValue"
              placeholder="00:00:00">
            @if (_form.controls.timeValue.hasError('required')) {
              <mat-error>Длительность обязательна</mat-error>
            }
          </mat-form-field>
        } @else {
          <mat-form-field appearance="fill">
            <mat-label>Значение</mat-label>
            <input matInput type="number" [formControl]="_form.controls.value" placeholder="Введите значение">
            @if (_form.controls.value.hasError('required')) {
              <mat-error>Значение обязательно</mat-error>
            }
          </mat-form-field>
        }

        <mat-checkbox [formControl]="_form.controls.hasDiscriminator">
          Использовать таймер для уменьшения значения
        </mat-checkbox>

        @if (_form.value.hasDiscriminator) {
          <div class="flex flex-col gap-2 p-3 border border-gray-300 rounded">
            <mat-form-field appearance="fill">
              <mat-label>Тип дискриминатора</mat-label>
              <mat-select [formControl]="_form.controls.discriminatorType">
                <mat-option value="value">Значение</mat-option>
                <mat-option value="range">Диапазон</mat-option>
              </mat-select>
              @if (_form.controls.discriminatorType.hasError('required')) {
                <mat-error>Тип обязателен</mat-error>
              }
            </mat-form-field>

            @if (_isDiscriminatorValue) {
              <mat-form-field appearance="fill">
                <mat-label>Значение</mat-label>
                <input
                  matInput
                  type="number"
                  [formControl]="_form.controls.discriminatorValue"
                  placeholder="0">
                @if (_form.controls.discriminatorValue.hasError('required')) {
                  <mat-error>Значение обязательно</mat-error>
                }
                @if (_form.controls.discriminatorValue.hasError('min')) {
                  <mat-error>Значение должно быть >= 0</mat-error>
                }
              </mat-form-field>
            } @else {
              <div class="flex gap-2">
                <mat-form-field appearance="fill" class="grow">
                  <mat-label>Минимум</mat-label>
                  <input
                    matInput
                    type="number"
                    [formControl]="_form.controls.discriminatorMin"
                    placeholder="0">
                  @if (_form.controls.discriminatorMin.hasError('required')) {
                    <mat-error>Минимум обязателен</mat-error>
                  }
                  @if (_form.controls.discriminatorMin.hasError('min')) {
                    <mat-error>Минимум должен быть >= 0</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="fill" class="grow">
                  <mat-label>Максимум</mat-label>
                  <input
                    matInput
                    type="number"
                    [formControl]="_form.controls.discriminatorMax"
                    placeholder="0">
                  @if (_form.controls.discriminatorMax.hasError('required')) {
                    <mat-error>Максимум обязателен</mat-error>
                  }
                  @if (_form.controls.discriminatorMax.hasError('min')) {
                    <mat-error>Максимум должен быть >= 0</mat-error>
                  }
                  @if (_form.controls.discriminatorMax.hasError('minGreaterThanMax')) {
                    <mat-error>Максимум должен быть >= минимума</mat-error>
                  }
                </mat-form-field>
              </div>
            }
          </div>
        }
      </form>

      <div class="flex justify-end gap-2">
        <button mat-button (click)="_handleCancel()">Отмена</button>
        <button
          mat-flat-button
          color="primary"
          [disabled]="_form.invalid"
          (click)="_handleSubmit()">
          {{ data.parameter ? 'Сохранить' : 'Добавить' }}
        </button>
      </div>
    </div>
  `,
  styles: ``
})
export class RescueParameterDialogComponent {
  protected readonly _dialogRef = inject<MatDialogRef<RescueParameterDialogComponent, AppRescueItemParameterVm>>(MatDialogRef);
  protected readonly data = inject<RescueParameterDialogData>(MAT_DIALOG_DATA);

  protected readonly _form = new FormGroup({
    label: new FormControl<string>('', Validators.required),
    value: new FormControl<number>(0, [Validators.required]),
    category: new FormControl<'number' | 'duration'>('number', Validators.required),
    timeValue: new FormControl<string>('00:00:00', Validators.required),
    hasDiscriminator: new FormControl<boolean>(false),
    discriminatorType: new FormControl<'value' | 'range'>('value', Validators.required),
    discriminatorValue: new FormControl<number>(0, [Validators.required]),
    discriminatorMin: new FormControl<number>(0, [Validators.required]),
    discriminatorMax: new FormControl<number>(0, [Validators.required])
  });

  protected get _isDuration() {
    return this._form.value.category === 'duration';
  }

  protected get _isDiscriminatorValue() {
    return this._form.value.discriminatorType === 'value';
  }

  constructor() {
    if (this.data.parameter) {
      const category = this.data.parameter.category || 'number';
      let timeValue = '00:00:00';
      let numericValue = 0;

      if (category === 'duration') {
        // Если value уже строка в формате HH:mm:ss, используем её напрямую
        if (typeof this.data.parameter.value === 'string') {
          timeValue = this.data.parameter.value;
        }
        else {
          // Если value число (старый формат), преобразуем в строку времени
          timeValue = this._minutesToTime(this.data.parameter.value);
        }
      }
      else {
        // Для number категории value должно быть числом
        numericValue = typeof this.data.parameter.value === 'number'
          ? this.data.parameter.value
          : 0;
      }

      const discriminator = this.data.parameter.discriminatorByTimer;
      const discriminatorType = discriminator?.type || 'value';
      // Если тип "value", используем min (или max, они должны быть равны) как значение
      const discriminatorValue = discriminatorType === 'value'
        ? (discriminator?.min ?? discriminator?.max ?? 0)
        : 0;

      this._form.patchValue({
        label: this.data.parameter.label,
        value: numericValue,
        category: category,
        timeValue: timeValue,
        hasDiscriminator: !!discriminator,
        discriminatorType: discriminatorType,
        discriminatorValue: discriminatorValue,
        discriminatorMin: discriminator?.min ?? 0,
        discriminatorMax: discriminator?.max ?? 0
      });
    }

    // Включаем/выключаем валидацию для полей discriminator
    this._form.controls.hasDiscriminator.valueChanges.subscribe((hasDiscriminator) => {
      this._updateDiscriminatorValidators();
    });

    // Обновляем валидацию при изменении типа discriminator
    this._form.controls.discriminatorType.valueChanges.subscribe(() => {
      this._updateDiscriminatorValidators();
      // При переключении на "value", синхронизируем значение
      if (this._form.value.discriminatorType === 'value') {
        const currentValue = this._form.controls.discriminatorValue.value ?? 0;
        this._form.patchValue({
          discriminatorMin: currentValue,
          discriminatorMax: currentValue
        }, { emitEvent: false });
      }
    });

    // Синхронизируем discriminatorValue с min/max для типа "value"
    this._form.controls.discriminatorValue.valueChanges.subscribe((value) => {
      if (this._form.value.discriminatorType === 'value' && value !== null) {
        this._form.patchValue({
          discriminatorMin: value,
          discriminatorMax: value
        }, { emitEvent: false });
      }
    });

    // Валидация max >= min при изменении min (только для типа "range")
    this._form.controls.discriminatorMin.valueChanges.subscribe(() => {
      if (this._form.value.discriminatorType === 'range') {
        this._form.controls.discriminatorMax.updateValueAndValidity({ emitEvent: false });
      }
    });

    // Синхронизируем timeValue с value при изменении категории
    this._form.controls.category.valueChanges.subscribe((category) => {
      if (category === 'duration') {
        // При переключении на duration, преобразуем текущее числовое value в время
        const currentValue = this._form.value.value || 0;
        this._form.patchValue({
          timeValue: this._minutesToTime(currentValue)
        }, { emitEvent: false });
      }
      else {
        // При переключении на number, сбрасываем timeValue и устанавливаем value в 0
        this._form.patchValue({
          timeValue: '00:00:00',
          value: 0
        }, { emitEvent: false });
      }
    });
  }

  private _updateDiscriminatorValidators(): void {
    const hasDiscriminator = this._form.value.hasDiscriminator;
    const discriminatorType = this._form.value.discriminatorType;

    if (hasDiscriminator) {
      this._form.controls.discriminatorType.setValidators([Validators.required]);

      if (discriminatorType === 'value') {
        // Для типа "value" валидируем только discriminatorValue
        this._form.controls.discriminatorValue.setValidators([Validators.required, Validators.min(0)]);
        this._form.controls.discriminatorMin.clearValidators();
        this._form.controls.discriminatorMax.clearValidators();
      }
      else {
        // Для типа "range" валидируем min и max
        this._form.controls.discriminatorValue.clearValidators();
        this._form.controls.discriminatorMin.setValidators([Validators.required, Validators.min(0)]);
        this._form.controls.discriminatorMax.setValidators([
          Validators.required,
          Validators.min(0),
          (control) => {
            const min = this._form.controls.discriminatorMin.value;
            if (min !== null && control.value !== null && control.value < min) {
              return { minGreaterThanMax: true };
            }
            return null;
          }
        ]);
      }
    }
    else {
      this._form.controls.discriminatorType.clearValidators();
      this._form.controls.discriminatorValue.clearValidators();
      this._form.controls.discriminatorMin.clearValidators();
      this._form.controls.discriminatorMax.clearValidators();
    }

    this._form.controls.discriminatorType.updateValueAndValidity({ emitEvent: false });
    this._form.controls.discriminatorValue.updateValueAndValidity({ emitEvent: false });
    this._form.controls.discriminatorMin.updateValueAndValidity({ emitEvent: false });
    this._form.controls.discriminatorMax.updateValueAndValidity({ emitEvent: false });
  }

  private _minutesToTime(minutes: number): string {
    const totalSeconds = minutes * 60;
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  protected _handleSubmit(): void {
    if (this._form.valid) {
      let finalValue: string | number;

      // Если категория duration, сохраняем строку времени напрямую
      if (this._form.value.category === 'duration' && this._form.value.timeValue) {
        finalValue = this._form.value.timeValue;
      }
      else {
        // Для number категории сохраняем число
        finalValue = this._form.value.value!;
      }

      // Формируем discriminatorByTimer, если включен
      let discriminatorByTimer: AppRescueItemParameterDiscriminatorByTimerVm | undefined;
      if (this._form.value.hasDiscriminator) {
        const discriminatorType = this._form.value.discriminatorType!;
        let min: number;
        let max: number;

        if (discriminatorType === 'value') {
          // Для типа "value" min = max = значение из discriminatorValue
          const value = this._form.value.discriminatorValue ?? 0;
          min = value;
          max = value;
        }
        else {
          // Для типа "range" используем отдельные min и max
          min = this._form.value.discriminatorMin ?? 0;
          max = this._form.value.discriminatorMax ?? 0;
        }

        discriminatorByTimer = {
          type: discriminatorType,
          min: min,
          max: max
        };
      }

      const result: AppRescueItemParameterVm = {
        id: this.data.parameter?.id || '',
        label: this._form.value.label!,
        value: finalValue,
        category: this._form.value.category!,
        discriminatorByTimer
      };
      this._dialogRef.close(result);
    }
  }

  protected _handleCancel(): void {
    this._dialogRef.close();
  }
}
