import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RescueStoryDataVm } from '@/core/utils';
import { debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-rescue-story-item-form',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './rescue-story-item-form.component.html',
  styles: ``
})
export class RescueStoryItemFormComponent {
  storyData = input.required<RescueStoryDataVm>();
  storyName = input.required<string>();
  startAtDisabled = input<boolean>(false);
  maxDurationMinutes = input<number>(0);
  totalDurationMinutes = input<number>(0);
  submitEvent = output<{ name: string; data: RescueStoryDataVm }>();

  protected readonly _form = new FormGroup({
    name: new FormControl<string>('', Validators.required),
    startAt: new FormControl<string>('', Validators.required),
    endAt: new FormControl<string>('', Validators.required)
  });

  private readonly _formValues = signal<{ name: string; startAt: string; endAt: string }>({ name: '', startAt: '', endAt: '' });

  protected readonly _duration = computed(() => {
    const { startAt, endAt } = this._formValues();
    if (!startAt || !endAt) {
      return 0;
    }
    const start = this._parseTimeToMinutes(startAt);
    const end = this._parseTimeToMinutes(endAt);
    return end - start;
  });

  protected readonly _isValidDuration = computed(() => {
    const duration = this._duration();
    const maxDuration = this.maxDurationMinutes();
    const totalDuration = this.totalDurationMinutes();
    return duration > 0 && (totalDuration + duration - this._getCurrentStoryDuration()) <= maxDuration;
  });

  constructor() {
    // Отслеживаем изменения формы
    this._form.valueChanges.subscribe(() => {
      this._formValues.set({
        name: this._form.value.name ?? '',
        startAt: this._form.value.startAt ?? '',
        endAt: this._form.value.endAt ?? ''
      });
    });

    // Автоматически эмитим изменения в родительский компонент с debounce
    this._form.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged((prev, curr) => 
          prev.name === curr.name && 
          prev.startAt === curr.startAt && 
          prev.endAt === curr.endAt
        )
      )
      .subscribe(() => {
        // Эмитим изменения при валидной форме
        if (this._form.valid && this._isValidDuration()) {
          const { name, startAt, endAt } = this._form.value;
          this.submitEvent.emit({
            name: name!,
            data: {
              startAt: this._parseTime(startAt!),
              endAt: this._parseTime(endAt!),
              scene: this.storyData().scene
            }
          });
        }
      });

    effect(() => {
      const data = this.storyData();
      const name = this.storyName();
      if (data) {
        const startAtFormatted = this._formatTime(data.startAt);
        const endAtFormatted = this._formatTime(data.endAt);

        // Обновляем только если значения изменились, чтобы не сбрасывать форму при вводе
        if (this._form.value.startAt !== startAtFormatted || 
            this._form.value.endAt !== endAtFormatted ||
            this._form.value.name !== name) {
          this._form.patchValue({
            name: name,
            startAt: startAtFormatted,
            endAt: endAtFormatted
          }, { emitEvent: true });
        }
      }
    });

    effect(() => {
      const disabled = this.startAtDisabled();
      if (disabled) {
        this._form.controls.startAt.disable({ emitEvent: false });
      }
      else {
        this._form.controls.startAt.enable({ emitEvent: false });
      }
    });
  }


  private _formatTime(minutes: string): string {
    // Преобразуем минуты (строку) в "HH:mm:ss"
    const totalSeconds = parseInt(minutes, 10) * 60 || 0;
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  private _parseTime(timeString: string): string {
    // Преобразуем "HH:mm:ss" в минуты (строку)
    const parts = timeString.split(':');
    const hours = parseInt(parts[0] || '0', 10);
    const minutes = parseInt(parts[1] || '0', 10);
    const seconds = parseInt(parts[2] || '0', 10);
    const totalMinutes = hours * 60 + minutes + Math.round(seconds / 60);
    return String(totalMinutes);
  }

  private _parseTimeToMinutes(timeString: string): number {
    // Преобразуем "HH:mm:ss" в минуты (число)
    const parts = timeString.split(':');
    const hours = parseInt(parts[0] || '0', 10);
    const minutes = parseInt(parts[1] || '0', 10);
    const seconds = parseInt(parts[2] || '0', 10);
    return hours * 60 + minutes + Math.round(seconds / 60);
  }

  private _getCurrentStoryDuration(): number {
    const data = this.storyData();
    if (!data) {
      return 0;
    }
    // data.startAt и data.endAt уже в формате минут (строка)
    const start = parseInt(data.startAt, 10) || 0;
    const end = parseInt(data.endAt, 10) || 0;
    return end - start;
  }
}
