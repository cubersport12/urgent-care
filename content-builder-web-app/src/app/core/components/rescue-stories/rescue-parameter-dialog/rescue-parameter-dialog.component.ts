import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AppRescueItemParameterVm } from '@/core/utils';
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
    timeValue: new FormControl<string>('00:00:00', Validators.required)
  });

  protected get _isDuration() {
    return this._form.value.category === 'duration';
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
          timeValue = this._minutesToTime(this.data.parameter.value as number);
        }
      }
      else {
        // Для number категории value должно быть числом
        numericValue = typeof this.data.parameter.value === 'number' 
          ? this.data.parameter.value 
          : 0;
      }

      this._form.patchValue({
        label: this.data.parameter.label,
        value: numericValue,
        category: category,
        timeValue: timeValue
      });
    }

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

      const result: AppRescueItemParameterVm = {
        id: this.data.parameter?.id || '',
        label: this._form.value.label!,
        value: finalValue,
        category: this._form.value.category!
      };
      this._dialogRef.close(result);
    }
  }

  protected _handleCancel(): void {
    this._dialogRef.close();
  }
}
